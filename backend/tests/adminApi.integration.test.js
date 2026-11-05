const request = require('supertest');
const { randomUUID } = require('crypto');
const config = require('../src/config');
const { query, pool } = require('../src/db');
const auth = require('../src/services/authService');
const { createApp } = require('../src/app');

const api = request(createApp());
const ids = [];
const PASSWORD = 'SyntheticAdminFixture!123';
let passwordHash;

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || new URL(config.databaseUrl).pathname !== '/nhatro_test') {
    throw new Error('Admin fixtures require nhatro_test');
  }
  expect((await query('SELECT current_database() AS name')).rows[0].name).toBe('nhatro_test');
  passwordHash = await auth.hashPassword(PASSWORD);
});

afterEach(async () => {
  jest.restoreAllMocks();
  if (ids.length) {
    await query('DELETE FROM admin_action_audits WHERE actor_user_id = ANY($1::bigint[]) OR target_user_id = ANY($1::bigint[])', [ids]);
    await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
    ids.length = 0;
  }
});

async function account(role = 'tenant', isActive = true, id = null) {
  const { rows } = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role, is_active)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))), $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, role, is_active`,
    [id, 'Admin Synthetic User', `admin-test-${randomUUID()}@gmail.com`, passwordHash, role, isActive]
  );
  ids.push(rows[0].id);
  return { ...rows[0], token: auth.issueToken(rows[0]).token };
}

function patch(actor, target, kind, body) {
  const req = api.patch(`/api/v1/admin/users/${encodeURIComponent(target.id || target)}/${kind}`);
  if (actor) req.set('Authorization', `Bearer ${actor.token}`);
  return req.send(body);
}

function expectError(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ success: false, error: { code, message: expect.any(String) } });
}

async function audits(target) {
  return (await query(
    `SELECT actor_user_id, target_user_id, action_type, previous_value, new_value, created_at
     FROM admin_action_audits WHERE target_user_id = $1 ORDER BY id`, [target.id]
  )).rows;
}

async function state(target) {
  return (await query('SELECT role, is_active FROM users WHERE id = $1', [target.id])).rows[0];
}

function interceptTransaction({ beforeConnect, transformQuery } = {}) {
  const connect = pool.connect.bind(pool);
  let intercepted = false;
  // pg's pool.query uses callback-style connect; intercept only the service's
  // promise-style checkout, after requireAuth has loaded its middleware snapshot.
  jest.spyOn(pool, 'connect').mockImplementation((...args) => {
    if (args.length || intercepted) return connect(...args);
    intercepted = true;
    return (async () => {
      if (beforeConnect) await beforeConnect();
      const client = await connect();
      if (transformQuery) {
        const actualQuery = client.query.bind(client);
        jest.spyOn(client, 'query').mockImplementation((sql, params, ...tail) => {
          if (typeof params === 'function' || tail.length) return actualQuery(sql, params, ...tail);
          return transformQuery(sql, params, actualQuery);
        });
      }
      return client;
    })();
  });
}

test('role transitions persist exact BIGINT IDs and one old/new audit per actual change', async () => {
  const actor = await account('admin', true, '9007199254740993');
  const target = await account('tenant', true, '9223372036854775807');
  for (const role of ['landlord', 'tenant']) {
    const res = await patch(actor, target, 'role', { role });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { changed: true, user: {
      id: target.id, fullName: target.full_name, email: target.email, role, isActive: true,
    } } });
    expect((await state(target)).role).toBe(role);
    const me = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${target.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe(role);
    const repeated = await patch(actor, target, 'role', { role });
    expect(repeated.status).toBe(200);
    expect(repeated.body.data.changed).toBe(false);
  }
  const rows = await audits(target);
  expect(rows).toHaveLength(2);
  expect(rows.map(row => [row.actor_user_id, row.target_user_id, row.action_type, row.previous_value, row.new_value]))
    .toEqual([
      [actor.id, target.id, 'role_change', 'tenant', 'landlord'],
      [actor.id, target.id, 'role_change', 'landlord', 'tenant'],
    ]);
  expect(rows.every(row => row.created_at instanceof Date)).toBe(true);
});

test.each(['role', 'status'])('same-value %s is an authorized no-op with no audit', async (kind) => {
  const actor = await account('admin');
  const target = await account();
  const body = kind === 'role' ? { role: 'tenant' } : { isActive: true };
  for (let i = 0; i < 2; i += 1) {
    const res = await patch(actor, target, kind, body);
    expect(res.status).toBe(200);
    expect(res.body.data.changed).toBe(false);
    expect(res.body.data.user.id).toBe(target.id);
  }
  expect(await audits(target)).toHaveLength(0);
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
});

test('authorization identifies the actor correctly when numeric lock order puts the target first', async () => {
  const target = await account('tenant', true, '9007199254740993');
  const actor = await account('admin', true, '9223372036854775807');
  const res = await patch(actor, target, 'role', { role: 'landlord' });
  expect(res.status).toBe(200);
  expect(res.body.data.user.id).toBe(target.id);
  const rows = await audits(target);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ actor_user_id: actor.id, target_user_id: target.id });
});

test.each([
  ['guest', 401, 'UNAUTHORIZED'], ['invalid-token', 401, 'UNAUTHORIZED'],
  ['inactive-admin', 403, 'INACTIVE_ACCOUNT'], ['tenant', 403, 'FORBIDDEN'], ['landlord', 403, 'FORBIDDEN'],
])('%s cannot change roles or status or create success audits', async (kind, status, code) => {
  const target = await account();
  let actor = null;
  if (kind === 'invalid-token') actor = { token: 'invalid-token' };
  else if (kind !== 'guest') actor = await account(kind === 'inactive-admin' ? 'admin' : kind, kind !== 'inactive-admin');
  expectError(await patch(actor, target, 'role', { role: 'landlord' }), status, code);
  expectError(await patch(actor, target, 'status', { isActive: false }), status, code);
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
  expect(await audits(target)).toHaveLength(0);
});

test.each([{}, { role: 'admin' }, { role: 'guest' }, { role: 1 }, { role: null }, { role: [] },
  { role: 'landlord', isActive: true }, { role: 'landlord', id: '1' }])(
  'role payload rejects missing/unsupported/type/extra fields', async (body) => {
    const actor = await account('admin');
    const target = await account();
    expectError(await patch(actor, target, 'role', body), 400, 'VALIDATION_ERROR');
    expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
    expect(await audits(target)).toHaveLength(0);
  }
);

test.each([{}, { isActive: 'false' }, { isActive: 0 }, { isActive: null }, { isActive: [] },
  { isActive: {} }, { isActive: false, role: 'tenant' }, { is_active: false }])(
  'status payload requires a strict boolean field', async (body) => {
    const actor = await account('admin');
    const target = await account();
    expectError(await patch(actor, target, 'status', body), 400, 'VALIDATION_ERROR');
    expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
    expect(await audits(target)).toHaveLength(0);
  }
);

test.each(['0', '-1', '01', 'not-an-id', '9223372036854775808', "1' OR 1=1 --"])(
  'invalid target ID %s never changes another account', async (id) => {
    const actor = await account('admin');
    const target = await account();
    expectError(await patch(actor, id, 'role', { role: 'landlord' }), 400, 'VALIDATION_ERROR');
    expectError(await patch(actor, id, 'status', { isActive: false }), 400, 'VALIDATION_ERROR');
    expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
    expect(await audits(target)).toHaveLength(0);
  }
);

test('missing target is NOT_FOUND for both admin operations', async () => {
  const actor = await account('admin');
  const target = await account();
  await query('DELETE FROM users WHERE id = $1', [target.id]);
  expectError(await patch(actor, target, 'role', { role: 'landlord' }), 404, 'NOT_FOUND');
  expectError(await patch(actor, target, 'status', { isActive: false }), 404, 'NOT_FOUND');
  expect(await audits(target)).toHaveLength(0);
});

test('admin targets, the requesting admin itself, and non-admin self-escalation are denied', async () => {
  const actor = await account('admin');
  const otherAdmin = await account('admin');
  for (const target of [actor, otherAdmin]) {
    expectError(await patch(actor, target, 'role', { role: 'tenant' }), 403, 'FORBIDDEN');
    expectError(await patch(actor, target, 'status', { isActive: false }), 403, 'FORBIDDEN');
    expectError(await patch(actor, target, 'status', { isActive: true }), 403, 'FORBIDDEN');
    expect(await state(target)).toEqual({ role: 'admin', is_active: true });
    expect(await audits(target)).toHaveLength(0);
  }
  const tenant = await account();
  expectError(await patch(tenant, tenant, 'role', { role: 'admin' }), 403, 'FORBIDDEN');
  expect(await state(tenant)).toEqual({ role: 'tenant', is_active: true });
});

test.each(['role', 'status'])('real PostgreSQL audit failure rolls back %s', async (kind) => {
  const actor = await account('admin');
  const target = await account();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  interceptTransaction({ transformQuery: (sql, params, actual) => {
    if (sql.includes('INSERT INTO admin_action_audits')) {
      return actual(sql, [...params.slice(0, 4), 'invalid-audit-value']);
    }
    return actual(sql, params);
  } });
  const res = await patch(actor, target, kind, kind === 'role' ? { role: 'landlord' } : { isActive: false });
  expectError(res, 500, 'INTERNAL');
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
  expect(await audits(target)).toHaveLength(0);
});

test.each(['role', 'status'])('real PostgreSQL mutation failure leaves no %s success audit', async (kind) => {
  const actor = await account('admin');
  const target = await account();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  interceptTransaction({ transformQuery: (sql, params, actual) => {
    if (sql.startsWith('UPDATE users')) return actual(sql, [kind === 'role' ? 'invalid-role' : null, params[1]]);
    return actual(sql, params);
  } });
  expectError(await patch(actor, target, kind, kind === 'role' ? { role: 'landlord' } : { isActive: false }), 500, 'INTERNAL');
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
  expect(await audits(target)).toHaveLength(0);
});

test.each([
  ['demoted', 403, 'FORBIDDEN'], ['inactive', 403, 'INACTIVE_ACCOUNT'], ['deleted', 401, 'UNAUTHORIZED'],
])('actor %s after middleware is re-checked inside the transaction', async (kind, status, code) => {
  const actor = await account('admin');
  const target = await account();
  interceptTransaction({ beforeConnect: async () => {
    if (kind === 'demoted') await query("UPDATE users SET role = 'tenant' WHERE id = $1", [actor.id]);
    if (kind === 'inactive') await query('UPDATE users SET is_active = false WHERE id = $1', [actor.id]);
    if (kind === 'deleted') await query('DELETE FROM users WHERE id = $1', [actor.id]);
  } });
  expectError(await patch(actor, target, 'role', { role: 'landlord' }), status, code);
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
  expect(await audits(target)).toHaveLength(0);
});

test.each([['promoted-admin', 403, 'FORBIDDEN'], ['deleted', 404, 'NOT_FOUND']])(
  'target %s before transaction locking cannot use an obsolete target state', async (kind, status, code) => {
    const actor = await account('admin');
    const target = await account();
    interceptTransaction({ beforeConnect: () => kind === 'deleted'
      ? query('DELETE FROM users WHERE id = $1', [target.id])
      : query("UPDATE users SET role = 'admin' WHERE id = $1", [target.id]) });
    expectError(await patch(actor, target, 'status', { isActive: false }), status, code);
    if (kind !== 'deleted') expect(await state(target)).toEqual({ role: 'admin', is_active: true });
    expect(await audits(target)).toHaveLength(0);
  }
);

test('concurrent role/status changes serialize and commit both distinct audit records', async () => {
  const actor = await account('admin');
  const target = await account();
  const results = await Promise.all([
    patch(actor, target, 'role', { role: 'landlord' }),
    patch(actor, target, 'status', { isActive: false }),
  ]);
  expect(results.map(res => res.status)).toEqual([200, 200]);
  expect(results.every(res => res.body.data.changed === true)).toBe(true);
  expect(await state(target)).toEqual({ role: 'landlord', is_active: false });
  const rows = await audits(target);
  expect(rows).toHaveLength(2);
  expect(rows.map(row => row.action_type).sort()).toEqual(['account_disable', 'role_change']);
});

test('disable/enable audits preserve identity and every owned/history fixture while enforcing current status', async () => {
  const actor = await account('admin');
  const target = await account('landlord');
  const { rows: listings } = await query(
    `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom)
     VALUES ($1, 'Historical listing', 'Synthetic historical content', 1000000, 20, 'Fixture address',
       'Fixture district', 10.77, 106.69, ST_SetSRID(ST_MakePoint(106.69, 10.77),4326)::geography)
     RETURNING id`, [target.id]
  );
  const listingId = listings[0].id;
  await query('INSERT INTO listing_images (listing_id, url) VALUES ($1, $2)', [listingId, 'fixture://historical-image']);
  await query('INSERT INTO listing_amenities (listing_id, amenity_id) SELECT $1, id FROM amenities ORDER BY id LIMIT 1', [listingId]);
  await query('INSERT INTO nearby_places (listing_id, category, name, distance_m) VALUES ($1, $2, $3, $4)',
    [listingId, 'school', 'Synthetic nearby place', 100]);
  await query('INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)', [target.id, listingId]);
  const snapshot = async () => {
    const user = (await query("SELECT to_jsonb(u) - 'is_active' AS row FROM users u WHERE id = $1", [target.id])).rows;
    const listing = (await query('SELECT * FROM listings WHERE id = $1', [listingId])).rows;
    const images = (await query('SELECT * FROM listing_images WHERE listing_id = $1 ORDER BY id', [listingId])).rows;
    const amenities = (await query('SELECT * FROM listing_amenities WHERE listing_id = $1', [listingId])).rows;
    const nearby = (await query('SELECT * FROM nearby_places WHERE listing_id = $1 ORDER BY id', [listingId])).rows;
    const favorites = (await query('SELECT * FROM favorites WHERE user_id = $1', [target.id])).rows;
    return JSON.stringify({ user, listing, images, amenities, nearby, favorites });
  };
  const before = await snapshot();
  const expiresBefore = auth.verifyToken(target.token).exp;
  const issue = jest.spyOn(auth, 'issueToken');
  const disabled = await patch(actor, target, 'status', { isActive: false });
  expect(disabled.status).toBe(200);
  expect(disabled.body.data.user.isActive).toBe(false);
  expectError(await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${target.token}`), 403, 'INACTIVE_ACCOUNT');
  expectError(await api.post('/api/v1/auth/login').send({ email: target.email, password: PASSWORD }), 403, 'INACTIVE_ACCOUNT');
  expect(issue).not.toHaveBeenCalled();
  expect((await snapshot()) === before).toBe(true);
  const repeatedDisable = await patch(actor, target, 'status', { isActive: false });
  expect(repeatedDisable.status).toBe(200);
  expect(repeatedDisable.body.data.changed).toBe(false);
  expect(await audits(target)).toHaveLength(1);
  const enabled = await patch(actor, target, 'status', { isActive: true });
  expect(enabled.status).toBe(200);
  expect(enabled.body.data.user).toEqual({ id: target.id, fullName: target.full_name, email: target.email, role: 'landlord', isActive: true });
  expect((await snapshot()) === before).toBe(true);
  expect((await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${target.token}`)).status).toBe(200);
  expect(auth.verifyToken(target.token).exp).toBe(expiresBefore);
  expect(issue).not.toHaveBeenCalled();
  expect((await api.post('/api/v1/auth/login').send({ email: target.email, password: PASSWORD })).status).toBe(200);
  expect(issue).toHaveBeenCalledTimes(1);
  const rows = await audits(target);
  expect(rows.map(row => [row.action_type, row.previous_value, row.new_value])).toEqual([
    ['account_disable', 'true', 'false'], ['account_enable', 'false', 'true'],
  ]);
});

test('migration stores only audited metadata, constrains values and retains referenced users', async () => {
  const actor = await account('admin');
  const target = await account();
  const columns = (await query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_action_audits' ORDER BY ordinal_position"
  )).rows.map(row => row.column_name);
  expect(columns).toEqual(['id', 'actor_user_id', 'target_user_id', 'action_type', 'previous_value', 'new_value', 'created_at']);
  await expect(query(
    `INSERT INTO admin_action_audits (actor_user_id, target_user_id, action_type, previous_value, new_value)
     VALUES ($1, $2, 'role_change', 'tenant', 'tenant')`, [actor.id, target.id]
  )).rejects.toMatchObject({ code: '23514' });
  expect((await patch(actor, target, 'role', { role: 'landlord' })).status).toBe(200);
  await expect(query('DELETE FROM users WHERE id = $1', [target.id])).rejects.toMatchObject({ code: '23503' });
  expect(await audits(target)).toHaveLength(1);
});

test('invalid role errors do not reflect the rejected client value', async () => {
  const actor = await account('admin');
  const target = await account();
  const marker = 'synthetic-private-role-value';
  const res = await patch(actor, target, 'role', { role: marker });
  expectError(res, 400, 'VALIDATION_ERROR');
  expect(res.body.error.message.includes(marker)).toBe(false);
  expect(await state(target)).toEqual({ role: 'tenant', is_active: true });
  expect(await audits(target)).toHaveLength(0);
});
