const request = require('supertest');
const { randomUUID } = require('node:crypto');
const { assertTestTarget } = require('../src/databaseConfig');
const { query } = require('../src/db');
const auth = require('../src/services/authService');
const { createApp } = require('../src/app');

const api = request(createApp());
const ids = [];
let passwordHash;

beforeAll(async () => {
  assertTestTarget();
  passwordHash = await auth.hashPassword('SyntheticLookupFixture!123');
});
afterEach(async () => {
  if (ids.length) await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
  ids.length = 0;
});

async function account(role = 'tenant', isActive = true, id = null) {
  const result = await query(`INSERT INTO users (id, full_name, email, password_hash, role, is_active)
    VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))), 'Synthetic Lookup User', $2, $3, $4, $5)
    RETURNING id, full_name, email, role, is_active`,
  [id, `lookup-${randomUUID()}@gmail.com`, passwordHash, role, isActive]);
  const user = result.rows[0];
  ids.push(user.id);
  return { ...user, token: auth.issueToken(user).token };
}

function lookup(actor, input) {
  const result = api.get('/api/v1/admin/users/lookup').query(input);
  if (actor) result.set('Authorization', `Bearer ${actor.token}`);
  return result;
}

test.each(['id', 'email'])('admin finds an inactive account by %s, preserving its exact BIGINT and returning only profile fields', async field => {
  const admin = await account('admin');
  const target = await account('landlord', false, '9223372036854775807');
  const identifier = field === 'id' ? target.id : ` ${target.email.toUpperCase()} `;
  const response = await lookup(admin, { identifier });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, data: { user: {
    id: target.id, fullName: target.full_name, email: target.email, role: 'landlord', isActive: false,
  } } });
  expect(JSON.stringify(response.body)).not.toMatch(/password|hash|token/i);
  expect((await query('SELECT role, is_active FROM users WHERE id = $1', [target.id])).rows[0]).toEqual({ role: 'landlord', is_active: false });
  expect((await query('SELECT id FROM admin_action_audits WHERE target_user_id = $1', [target.id])).rowCount).toBe(0);
});

test('admin can identify a protected administrator without modifying it', async () => {
  const admin = await account('admin');
  const response = await lookup(admin, { identifier: admin.email });
  expect(response.status).toBe(200);
  expect(response.body.data.user).toMatchObject({ id: admin.id, role: 'admin', isActive: true });
});

test('unknown accounts and malformed queries return safe errors', async () => {
  const admin = await account('admin');
  const missing = await lookup(admin, { identifier: `unknown-${randomUUID()}@gmail.com` });
  expect(missing.status).toBe(404);
  expect(missing.body.error.code).toBe('NOT_FOUND');
  for (const input of [{}, { identifier: '0' }, { identifier: '01' }, { identifier: '9223372036854775808' },
    { identifier: "x@gmail.com' OR 1=1 --" }, { identifier: admin.email, role: 'admin' }, { identifier: [admin.id, '1'] }]) {
    const response = await lookup(admin, input);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  }
});

test('guests, non-admins and inactive admins cannot search accounts', async () => {
  const guest = await lookup(null, { identifier: '1' });
  expect(guest.status).toBe(401);
  for (const [role, active] of [['tenant', true], ['landlord', true], ['admin', false]]) {
    const actor = await account(role, active);
    const response = await lookup(actor, { identifier: actor.id });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(active ? 'FORBIDDEN' : 'INACTIVE_ACCOUNT');
    expect(response.body.data).toBeUndefined();
  }
});

test('a demoted admin token cannot keep searching accounts', async () => {
  const admin = await account('admin');
  await query("UPDATE users SET role = 'tenant' WHERE id = $1", [admin.id]);
  const response = await lookup(admin, { identifier: admin.id });
  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe('FORBIDDEN');
});
