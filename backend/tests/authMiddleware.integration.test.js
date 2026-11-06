const express = require('express');
const request = require('supertest');
const { randomUUID } = require('crypto');
const { assertTestTarget } = require('../src/databaseConfig');
const { query } = require('../src/db');
const { issueToken } = require('../src/services/authService');
const { requireAuth } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');

// This route exists only in the test app; production has no T005 probe endpoint.
const app = express();
app.use(express.json());
app.all('/protected', requireAuth, (req, res) => res.json({ user: req.user }));
app.use(errorHandler);
const api = request(app);
const fixtureIds = [];

beforeAll(async () => {
  assertTestTarget();
});

afterEach(async () => {
  // Delete only this test's synthetic users; never reset shared or development data.
  if (fixtureIds.length) {
    await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [fixtureIds]);
    fixtureIds.length = 0;
  }
});

async function fixture(id) {
  const email = `t005-${randomUUID()}@gmail.com`;
  const { rows } = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role, is_active)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))),
             $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, role, is_active`,
    [id || null, 'T005 Synthetic User', email, 'synthetic-hash-not-used-for-login', 'tenant', true]
  );
  fixtureIds.push(rows[0].id);
  return { row: rows[0], token: issueToken(rows[0]).token };
}

test('loads the current safe contract profile, ignoring client identity and role', async () => {
  const { row, token } = await fixture();
  await query('UPDATE users SET full_name = $1 WHERE id = $2', ['Current DB Name', row.id]);
  const res = await api.post('/protected?role=admin&id=2')
    .set('Authorization', `Bearer ${token}`)
    .send({ role: 'admin', isActive: false, id: '2', token: 'client-token' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ user: {
    id: row.id, fullName: 'Current DB Name', email: row.email, role: 'tenant', isActive: true,
  } });
});

test('applies role changes in both directions using the same signed token', async () => {
  const { row, token } = await fixture();
  for (const role of ['tenant', 'landlord', 'tenant']) {
    await query('UPDATE users SET role = $1 WHERE id = $2', [role, row.id]);
    const res = await api.get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  }
});

test('blocks a locked account on its next request and allows it after reactivation', async () => {
  const { row, token } = await fixture();
  expect((await api.get('/protected').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  await query('UPDATE users SET is_active = false WHERE id = $1', [row.id]);
  const blocked = await api.post('/protected').set('Authorization', `Bearer ${token}`)
    .send({ isActive: true, role: 'admin' });
  expect(blocked.status).toBe(403);
  expect(blocked.body).toEqual({ success: false, error: {
    code: 'INACTIVE_ACCOUNT', message: expect.any(String),
  } });
  await query('UPDATE users SET is_active = true WHERE id = $1', [row.id]);
  expect((await api.get('/protected').set('Authorization', `Bearer ${token}`)).status).toBe(200);
});

test('rejects the existing token after its user is deleted', async () => {
  const { row, token } = await fixture();
  await query('DELETE FROM users WHERE id = $1', [row.id]);
  const res = await api.get('/protected').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

test.each(['9007199254740993', '9223372036854775807'])(
  'retrieves the exact PostgreSQL BIGINT user %s', async (id) => {
    const { token } = await fixture(id);
    const res = await api.get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(id);
  }
);

test('returns 401 rather than a PostgreSQL range error for an out-of-range subject', async () => {
  const { token } = issueToken({ id: '9223372036854775808', role: 'tenant' });
  const res = await api.get('/protected').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

test('does not authenticate from body or query tokens', async () => {
  const { token } = await fixture();
  const res = await api.post(`/protected?token=${encodeURIComponent(token)}`)
    .send({ token, role: 'admin' });
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});
