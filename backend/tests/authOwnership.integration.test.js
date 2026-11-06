const { assertTestTarget } = require('../src/databaseConfig');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const config = require('../src/config');
const { query, pool } = require('../src/db');
const { issueToken } = require('../src/services/authService');
const { requireAuth, requireRole, requireOwnership } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { sendSuccess } = require('../src/utils/response');
const AppError = require('../src/utils/AppError');

const userIds = [];
const listingIds = [];
const app = express();
app.use(express.json());

// A test-only mutation probe proves that rejection stops work after the guards.
// This is not a production listing action or evidence for T025/T027 integration.
const mutate = jest.fn(async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE listings SET title = 'Changed by ownership test'
       WHERE id = $1 AND owner_id = $2 RETURNING id`, [req.params.id, req.user.id]
    );
    if (!rows[0]) throw new AppError(403, 'FORBIDDEN', 'Ownership changed');
    return sendSuccess(res, { id: rows[0].id, changed: true });
  } catch (err) {
    return next(err);
  }
});
app.post('/ownership/:id', requireAuth, requireOwnership, mutate);
app.post('/landlord/:id', requireAuth, requireRole('landlord'), requireOwnership, mutate);
app.use(errorHandler);
const api = request(app);

beforeAll(async () => {
  assertTestTarget();
});

beforeEach(() => mutate.mockClear());

afterEach(async () => {
  jest.restoreAllMocks();
  if (listingIds.length) await query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [listingIds]);
  if (userIds.length) await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
  listingIds.length = 0;
  userIds.length = 0;
});

async function account(role = 'landlord', id = null) {
  const { rows } = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))), $2, $3, $4, $5)
     RETURNING id, role`,
    [id, 'Ownership Synthetic User', `ownership-${randomUUID()}@gmail.com`, 'synthetic-not-for-login', role]
  );
  userIds.push(rows[0].id);
  return { ...rows[0], token: issueToken(rows[0]).token };
}

async function listing(owner, id = null) {
  const { rows } = await query(
    `INSERT INTO listings (id, owner_id, title, description, price, area_m2, address, district, lat, lng, geom)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('listings', 'id'))),
       $2, 'Original fixture title', 'Private fixture description', 1000000, 20,
       'Synthetic address', 'Synthetic district', 10.77, 106.69,
       ST_SetSRID(ST_MakePoint(106.69, 10.77), 4326)::geography)
     RETURNING id, owner_id, title`, [id, owner.id]
  );
  listingIds.push(rows[0].id);
  return rows[0];
}

function expectError(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ success: false, error: { code, message: expect.any(String) } });
}

async function expectUnchanged(item) {
  expect(mutate).not.toHaveBeenCalled();
  expect((await query('SELECT title FROM listings WHERE id = $1', [item.id])).rows[0].title).toBe(item.title);
}

test('the exact BIGINT owner passes the composed guard and reaches the mutation probe', async () => {
  const owner = await account('landlord', '9007199254740993');
  const item = await listing(owner, '9223372036854775807');
  const res = await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${owner.token}`)
    .send({ owner_id: '1', userId: '1' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: { id: '9223372036854775807', changed: true } });
  expect(mutate).toHaveBeenCalledTimes(1);
  expect((await query('SELECT title FROM listings WHERE id = $1', [item.id])).rows[0].title)
    .toBe('Changed by ownership test');
});

test.each(['tenant', 'landlord', 'admin'])(
  '%s cannot claim another user listing by spoofing body/query ownership', async (role) => {
    const owner = await account('landlord', '9007199254740993');
    const other = await account(role, '9007199254740992');
    const item = await listing(owner);
    const res = await api.post(`/ownership/${item.id}?owner_id=${other.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ owner_id: other.id, userId: owner.id, role: 'admin' });
    expectError(res, 403, 'FORBIDDEN');
    await expectUnchanged(item);
  }
);

test.each([['tenant', 403], ['admin', 403], ['landlord', 200]])(
  'ownership does not grant landlord role to a %s owner', async (role, status) => {
    const owner = await account(role);
    const item = await listing(owner);
    const guarded = await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(guarded.status).toBe(status);
    if (status === 403) {
      expectError(guarded, 403, 'FORBIDDEN');
      await expectUnchanged(item);
    }
    // The standalone ownership predicate remains independent of role policy.
    expect((await api.post(`/ownership/${item.id}`).set('Authorization', `Bearer ${owner.token}`)).status).toBe(200);
  }
);

test.each(['0', '-1', '01', 'not-an-id', '9223372036854775808', "1' OR 1=1 --"])(
  'invalid listing ID %s is rejected without mutation', async (id) => {
    const owner = await account();
    const item = await listing(owner);
    const res = await api.post(`/landlord/${encodeURIComponent(id)}`).set('Authorization', `Bearer ${owner.token}`);
    expectError(res, 400, 'VALIDATION_ERROR');
    await expectUnchanged(item);
  }
);

test('a deleted listing returns NOT_FOUND without reaching protected work', async () => {
  const owner = await account();
  const item = await listing(owner);
  await query('DELETE FROM listings WHERE id = $1', [item.id]);
  expectError(await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${owner.token}`), 404, 'NOT_FOUND');
  expect(mutate).not.toHaveBeenCalled();
});

test('the next request uses a changed stored owner with the same token', async () => {
  const owner = await account();
  const nextOwner = await account();
  const item = await listing(owner);
  await query('UPDATE listings SET owner_id = $1 WHERE id = $2', [nextOwner.id, item.id]);
  expectError(await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${owner.token}`), 403, 'FORBIDDEN');
  await expectUnchanged(item);
  expect((await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${nextOwner.token}`)).status).toBe(200);
});

test.each(['missing', 'expired', 'tampered', 'inactive'])(
  'a %s session cannot disclose or mutate the fixture listing', async (kind) => {
    const owner = await account();
    const item = await listing(owner);
    let token = owner.token;
    if (kind === 'expired') {
      token = jwt.sign({ sub: owner.id, role: owner.role, iat: Math.floor(Date.now() / 1000) - 3601 },
        config.jwtSecret, { algorithm: 'HS256', expiresIn: 3600 });
    }
    if (kind === 'tampered') {
      const parts = token.split('.');
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      claims.role = 'admin';
      parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
      token = parts.join('.');
    }
    if (kind === 'inactive') await query('UPDATE users SET is_active = false WHERE id = $1', [owner.id]);
    const req = api.post(`/landlord/${item.id}`).send({ role: 'landlord', owner_id: owner.id, isActive: true });
    if (kind !== 'missing') req.set('Authorization', `Bearer ${token}`);
    expectError(await req, kind === 'inactive' ? 403 : 401, kind === 'inactive' ? 'INACTIVE_ACCOUNT' : 'UNAUTHORIZED');
    await expectUnchanged(item);
  }
);

test('an ownership query failure stays a safe 500 through Express 4', async () => {
  const owner = await account();
  const item = await listing(owner);
  const originalQuery = pool.query.bind(pool);
  const error = Object.assign(new Error('Synthetic ownership DB failure'), { code: 'ECONNRESET' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Inject only this failure; fixtures, user reloads and all other SQL stay real.
  jest.spyOn(pool, 'query').mockImplementation((sql, params) =>
    /^SELECT owner_id FROM listings/.test(sql) ? Promise.reject(error) : originalQuery(sql, params)
  );
  expectError(await api.post(`/landlord/${item.id}`).set('Authorization', `Bearer ${owner.token}`), 500, 'INTERNAL');
  await expectUnchanged(item);
});
