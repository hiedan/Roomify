const { assertTestTarget } = require('../src/databaseConfig');
const express = require('express');
const request = require('supertest');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { inspect } = require('util');
const config = require('../src/config');
const { query, pool } = require('../src/db');
const { createApp } = require('../src/app');
const auth = require('../src/services/authService');
const { requireAuth, requireRole, requireAdmin } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');

const api = request(createApp());
const emails = [];
const originalSecret = config.jwtSecret;
const PASSWORD = '  SyntheticPass!123  ';
let passwordHash;

// Policy probes are test-only; production mounts only the four auth endpoints.
const policies = express();
policies.use(express.json());
policies.post('/landlord', requireAuth, requireRole('landlord'), (req, res) => res.json(req.user));
policies.post('/admin', requireAuth, requireAdmin, (req, res) => res.json(req.user));
policies.use(errorHandler);
const policyApi = request(policies);

beforeAll(async () => {
  assertTestTarget();
  passwordHash = await auth.hashPassword(PASSWORD);
});

afterEach(async () => {
  config.jwtSecret = originalSecret;
  jest.restoreAllMocks();
  if (emails.length) {
    await query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
    emails.length = 0;
  }
});

function freshEmail() {
  const email = `foundation-${randomUUID()}@gmail.com`;
  emails.push(email);
  return email;
}

async function fixture(role = 'tenant', isActive = true, id = null) {
  const email = freshEmail();
  const { rows } = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role, is_active)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))), $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, role, is_active`,
    [id, 'Foundation Synthetic User', email, passwordHash, role, isActive]
  );
  return { user: rows[0], token: auth.issueToken(rows[0]).token };
}

function expectError(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ success: false, error: { code, message: expect.any(String) } });
}

test('register creates one active tenant, hashes the exact password and establishes a standard session', async () => {
  const email = freshEmail();
  const res = await api.post('/api/v1/auth/register').send({
    fullName: '  Foundation User  ', email: `  ${email.toUpperCase()}  `,
    password: PASSWORD, rememberMe: true,
  });
  expect(res.status).toBe(201);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  expect(rows).toHaveLength(1);
  expect(rows[0].full_name).toBe('Foundation User');
  expect(rows[0].role).toBe('tenant');
  expect(rows[0].is_active).toBe(true);
  expect(rows[0].password_hash).not.toBe(PASSWORD);
  expect(await bcrypt.compare(PASSWORD, rows[0].password_hash)).toBe(true);
  expect(bcrypt.getRounds(rows[0].password_hash)).toBe(12);
  expect(res.body.success).toBe(true);
  expect(Object.keys(res.body).sort()).toEqual(['data', 'success']);
  expect(Object.keys(res.body.data).sort()).toEqual(['expiresIn', 'token', 'user']);
  expect(res.body.data.user).toEqual({
    id: rows[0].id, fullName: 'Foundation User', email, role: 'tenant', isActive: true,
  });
  expect(res.body.data.expiresIn).toBe(3600);
  const claims = auth.verifyToken(res.body.data.token);
  expect(claims.sub).toBe(rows[0].id);
  expect(claims.role).toBe('tenant');
  expect(claims.exp - claims.iat).toBe(3600);
  const me = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);
  expect(me.body).toEqual({ success: true, data: res.body.data.user });
});

test('concurrent normalized duplicate registrations yield one 201 and one 409', async () => {
  const email = freshEmail();
  const responses = await Promise.all([email, ` ${email.toUpperCase()} `].map((variant) =>
    api.post('/api/v1/auth/register').send({ fullName: 'Concurrent User', email: variant, password: PASSWORD })
  ));
  expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
  expectError(responses.find(r => r.status === 409), 409, 'EMAIL_CONFLICT');
  const { rows } = await query('SELECT count(*)::int AS count FROM users WHERE email = $1', [email]);
  expect(rows[0].count).toBe(1);
});

test.each([
  { role: 'admin' }, { is_active: true }, { isActive: true }, { rememberMe: 'false' },
  { fullName: 'x' }, { password: 'short' }, { password: 'é'.repeat(37) }, { email: 'other@example.com' },
  { id: '1' }, { passwordHash: 'client-hash' }, { password_hash: 'client-hash' }, { extra: 'unsupported' },
  { fullName: undefined }, { email: undefined }, { password: undefined },
  { fullName: null }, { fullName: [] }, { email: 42 }, { password: {} },
  { fullName: 'a'.repeat(101) }, { password: '😀'.repeat(7) }, { password: 'a'.repeat(73) }, { rememberMe: null },
])('invalid or unsupported registration data does not create an account', async (change) => {
  const email = freshEmail();
  const res = await api.post('/api/v1/auth/register').send({
    fullName: 'Synthetic User', email, password: PASSWORD, ...change,
  });
  expectError(res, 400, 'VALIDATION_ERROR');
  expect((await query('SELECT id FROM users WHERE email = $1', [email])).rows).toHaveLength(0);
});

test('invalid JWT configuration rolls back registration and preserves AUTH_CONFIG_ERROR', async () => {
  const email = freshEmail();
  config.jwtSecret = 'change-me';
  const res = await api.post('/api/v1/auth/register').send({ fullName: 'Synthetic User', email, password: PASSWORD });
  expectError(res, 500, 'AUTH_CONFIG_ERROR');
  expect((await query('SELECT id FROM users WHERE email = $1', [email])).rows).toHaveLength(0);
});

test.each(['tenant', 'landlord', 'admin'])('login returns the safe current %s account', async (role) => {
  const { user } = await fixture(role);
  const res = await api.post('/api/v1/auth/login').send({
    email: ` ${user.email.toUpperCase()} `, password: PASSWORD,
  });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Object.keys(res.body).sort()).toEqual(['data', 'success']);
  expect(Object.keys(res.body.data).sort()).toEqual(['expiresIn', 'token', 'user']);
  expect(res.body.data.user).toEqual({
    id: user.id, fullName: user.full_name, email: user.email, role, isActive: true,
  });
  expect(res.body.data.expiresIn).toBe(3600);
  expect(auth.verifyToken(res.body.data.token).sub).toBe(user.id);
});

test.each([
  ['omitted', undefined, 3600], ['false', false, 3600], ['true', true, 604800],
])('login rememberMe=%s (%p) enforces its %i-second lifetime without waiting', async (_label, rememberMe, ttl) => {
  const { user } = await fixture();
  const now = Math.floor(Date.now() / 1000);
  const clock = jest.spyOn(Date, 'now').mockReturnValue(now * 1000);
  const res = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD, rememberMe });
  expect(res.status).toBe(200);
  expect(res.body.data.expiresIn).toBe(ttl);
  const claims = auth.verifyToken(res.body.data.token);
  expect(claims.iat).toBe(now);
  expect(claims.exp - claims.iat).toBe(ttl);
  clock.mockReturnValue((now + ttl - 1) * 1000);
  expect(auth.verifyToken(res.body.data.token).sub).toBe(user.id);
  for (const at of [ttl, ttl + 1]) {
    clock.mockReturnValue((now + at) * 1000);
    expect(() => auth.verifyToken(res.body.data.token)).toThrow(
      expect.objectContaining({ status: 401, code: 'UNAUTHORIZED' })
    );
  }
});

test('unknown email and wrong password receive identical credential errors', async () => {
  const { user } = await fixture();
  const issue = jest.spyOn(auth, 'issueToken');
  const wrong = await api.post('/api/v1/auth/login').send({ email: user.email, password: 'WrongPass!123' });
  const unknown = await api.post('/api/v1/auth/login').send({ email: freshEmail(), password: PASSWORD });
  expectError(wrong, 401, 'INVALID_CREDENTIALS');
  expectError(unknown, 401, 'INVALID_CREDENTIALS');
  expect(wrong.body).toEqual(unknown.body);
  expect(issue).not.toHaveBeenCalled();
});

test('inactive accounts receive INACTIVE_ACCOUNT only with the correct password', async () => {
  const { user } = await fixture('tenant', false);
  const issue = jest.spyOn(auth, 'issueToken');
  const denied = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
  expectError(denied, 403, 'INACTIVE_ACCOUNT');
  const wrong = await api.post('/api/v1/auth/login').send({ email: user.email, password: 'WrongPass!123' });
  expectError(wrong, 401, 'INVALID_CREDENTIALS');
  expect(issue).not.toHaveBeenCalled();
});

test('invalid JWT configuration also fails login without returning a session', async () => {
  const { user } = await fixture();
  config.jwtSecret = 'change-me';
  const res = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
  expectError(res, 500, 'AUTH_CONFIG_ERROR');
});

test('me reloads current name, role and status and rejects a deleted account', async () => {
  const { user, token } = await fixture('tenant', true, '9007199254740993');
  await query('UPDATE users SET full_name = $1, role = $2 WHERE id = $3', ['Updated DB Name', 'landlord', user.id]);
  const me = await api.get('/api/v1/auth/me?role=admin').set('Authorization', `Bearer ${token}`);
  expect(me.status).toBe(200);
  expect(me.body.data).toEqual({
    id: user.id, fullName: 'Updated DB Name', email: user.email, role: 'landlord', isActive: true,
  });
  await query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
  expectError(await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`), 403, 'INACTIVE_ACCOUNT');
  await query('DELETE FROM users WHERE id = $1', [user.id]);
  expectError(await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`), 401, 'UNAUTHORIZED');
});

test('me requires an Authorization header rather than query credentials', async () => {
  const { token } = await fixture();
  expectError(await api.get(`/api/v1/auth/me?token=${encodeURIComponent(token)}`), 401, 'UNAUTHORIZED');
  expectError(await api.get('/api/v1/auth/me').set('Authorization', 'Bearer invalid'), 401, 'UNAUTHORIZED');
});

test('logout is idempotent and leaves a copied valid token subject to its normal checks', async () => {
  const { token } = await fixture();
  for (let i = 0; i < 2; i += 1) {
    const res = await api.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { loggedOut: true } });
  }
  const me = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  expect(me.status).toBe(200);
});

test.each([
  ['tenant', '/landlord', 403], ['landlord', '/landlord', 200], ['admin', '/landlord', 403],
  ['tenant', '/admin', 403], ['landlord', '/admin', 403], ['admin', '/admin', 200],
])('DB %s accessing %s yields %i despite spoofed client role', async (role, path, status) => {
  const { token } = await fixture(role);
  const res = await policyApi.post(path).set('Authorization', `Bearer ${token}`)
    .send({ role: 'admin', isActive: true });
  expect(res.status).toBe(status);
  if (status === 403) expectError(res, 403, 'FORBIDDEN');
});

test('role policy observes both promotion and demotion with the same token, then account locking', async () => {
  const { user, token } = await fixture('admin');
  for (const [role, status] of [['admin', 200], ['tenant', 403], ['admin', 200]]) {
    await query('UPDATE users SET role = $1 WHERE id = $2', [role, user.id]);
    const res = await policyApi.post('/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(status);
  }
  await query("UPDATE users SET role = 'admin', is_active = false WHERE id = $1", [user.id]);
  expectError(await policyApi.post('/admin').set('Authorization', `Bearer ${token}`), 403, 'INACTIVE_ACCOUNT');
  expectError(await policyApi.post('/admin').send({ role: 'admin' }), 401, 'UNAUTHORIZED');
});

test('auth routes preserve notFound and malformed-JSON handling', async () => {
  expectError(await api.get('/api/v1/auth/not-a-route'), 404, 'NOT_FOUND');
  const res = await api.post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad json');
  expectError(res, 400, 'VALIDATION_ERROR');
});

describe('US1 registration acceptance gaps', () => {
  test('a sequential normalized duplicate leaves the original account unchanged', async () => {
    const email = freshEmail();
    const payload = { fullName: 'Original User', email, password: PASSWORD };
    const created = await api.post('/api/v1/auth/register').send(payload);
    expect(created.status).toBe(201);
    const before = await query('SELECT id, full_name, password_hash, role, is_active FROM users WHERE email = $1', [email]);
    const issue = jest.spyOn(auth, 'issueToken');
    const duplicate = await api.post('/api/v1/auth/register').send({
      ...payload, fullName: 'Must Not Replace', email: ` ${email.toUpperCase()} `,
    });
    expectError(duplicate, 409, 'EMAIL_CONFLICT');
    expect(issue).not.toHaveBeenCalled();
    const after = await query('SELECT id, full_name, password_hash, role, is_active FROM users WHERE email = $1', [email]);
    expect(after.rows).toHaveLength(1);
    // Compare privately so a failed assertion never prints the stored hash.
    expect(JSON.stringify(after.rows) === JSON.stringify(before.rows)).toBe(true);
  });

  test('Gmail dots and plus-tags remain separate persisted addresses', async () => {
    const base = freshEmail();
    const variants = [base, base.replace('foundation-', 'foun.dation-'),
      base.replace('@', '+tag@'), base.replace('@', '+another@')];
    emails.push(...variants.slice(1));
    for (const email of variants) {
      const res = await api.post('/api/v1/auth/register').send({ fullName: 'Alias User', email, password: PASSWORD });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(email);
    }
    const { rows } = await query('SELECT id, email FROM users WHERE email = ANY($1::text[])', [variants]);
    expect(rows.map(row => row.email).sort()).toEqual([...variants].sort());
    expect(new Set(rows.map(row => row.id)).size).toBe(4);
  });

  test.each([
    ['ASCII minimum', ' Ab '], ['ASCII maximum', 'a'.repeat(100)],
    ['Unicode UTF-16 maximum', '😀'.repeat(50)],
  ])('persists the trimmed name at its %s boundary', async (_label, fullName) => {
    const email = freshEmail();
    const res = await api.post('/api/v1/auth/register').send({ fullName, email, password: PASSWORD });
    expect(res.status).toBe(201);
    const { rows } = await query('SELECT full_name FROM users WHERE email = $1', [email]);
    expect(rows[0].full_name).toBe(fullName.trim());
    expect(res.body.data.user.fullName).toBe(fullName.trim());
  });

  test('persists a normalized 255-code-unit email without truncation', async () => {
    const prefix = `boundary-${randomUUID()}`;
    const email = `${prefix}${'a'.repeat(245 - prefix.length)}@gmail.com`;
    emails.push(email);
    expect(email.length).toBe(255);
    const res = await api.post('/api/v1/auth/register').send({
      fullName: 'Email Boundary User', email: ` ${email.toUpperCase()} `, password: PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    const { rows } = await query('SELECT email FROM users WHERE email = $1', [email]);
    expect(rows).toEqual([{ email }]);
  });

  test.each([
    ['eight Unicode points', '😀'.repeat(8)],
    ['72 UTF-8 bytes', 'é'.repeat(36)], ['72 ASCII bytes', 'a'.repeat(72)],
  ])('registration and login accept the same exact password at %s', async (_label, password) => {
    const email = freshEmail();
    const registered = await api.post('/api/v1/auth/register').send({ fullName: 'Password Boundary User', email, password });
    expect(registered.status).toBe(201);
    const loggedIn = await api.post('/api/v1/auth/login').send({ email, password });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.data.user.id).toBe(registered.body.data.user.id);
  });

  test('a signer failure rolls back the real transaction and permits retrying the same email', async () => {
    const email = freshEmail();
    const payload = { fullName: 'Rollback User', email, password: PASSWORD };
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sign = jest.spyOn(jwt, 'sign').mockImplementationOnce(() => { throw new Error('Synthetic signing failure'); });
    const rejected = await api.post('/api/v1/auth/register').send(payload);
    expectError(rejected, 500, 'INTERNAL');
    expect(sign).toHaveBeenCalledTimes(1);
    expect((await query('SELECT id FROM users WHERE email = $1', [email])).rows).toHaveLength(0);
    const logged = inspect(log.mock.calls, { depth: null });
    expect(logged.includes(PASSWORD)).toBe(false);
    expect(logged.includes(config.jwtSecret)).toBe(false);
    sign.mockRestore();
    expect((await api.post('/api/v1/auth/register').send(payload)).status).toBe(201);
    expect((await query('SELECT id FROM users WHERE email = $1', [email])).rows).toHaveLength(1);
  });
});

describe('US1/US2 malformed payloads', () => {
  test.each([
    ['missing', undefined], ['null', 'null'], ['array', '[]'],
    ['string', '"text"'], ['number', '42'], ['broken JSON', '{bad json'],
  ])('both public endpoints reject a %s payload without creating data', async (_label, body) => {
    const before = (await query('SELECT count(*)::int AS count FROM users')).rows[0].count;
    for (const route of ['register', 'login']) {
      const res = await api.post(`/api/v1/auth/${route}`).set('Content-Type', 'application/json').send(body);
      expectError(res, 400, 'VALIDATION_ERROR');
    }
    const after = (await query('SELECT count(*)::int AS count FROM users')).rows[0].count;
    expect(after).toBe(before);
  });
});

describe('US2 login acceptance gaps', () => {
  test.each([
    { email: undefined }, { password: undefined }, { email: 42 }, { password: [] },
    { email: 'other@example.com' }, { password: '😀'.repeat(7) }, { password: 'é'.repeat(37) },
    { rememberMe: 'true' }, { rememberMe: 1 }, { role: 'admin' }, { id: '1' }, { isActive: true },
  ])('invalid login input returns validation error without issuing a token', async (change) => {
    const { user } = await fixture();
    const issue = jest.spyOn(auth, 'issueToken');
    const res = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD, ...change });
    expectError(res, 400, 'VALIDATION_ERROR');
    expect(issue).not.toHaveBeenCalled();
  });

  test('password comparison preserves spaces and case at the API boundary', async () => {
    const { user } = await fixture();
    const issue = jest.spyOn(auth, 'issueToken');
    for (const password of [PASSWORD.trim(), PASSWORD.toLowerCase(), PASSWORD.slice(1)]) {
      const res = await api.post('/api/v1/auth/login').send({ email: user.email, password });
      expectError(res, 401, 'INVALID_CREDENTIALS');
    }
    expect(issue).not.toHaveBeenCalled();
    const exact = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
    expect(exact.status).toBe(200);
    expect(issue).toHaveBeenCalledTimes(1);
  });

  test('each login returns the current DB role and exact BIGINT ID in both profile and JWT', async () => {
    const { user } = await fixture('tenant', true, '9223372036854775807');
    for (const role of ['tenant', 'landlord', 'admin']) {
      await query('UPDATE users SET role = $1 WHERE id = $2', [role, user.id]);
      const res = await api.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual({
        id: '9223372036854775807', fullName: user.full_name, email: user.email, role, isActive: true,
      });
      expect(auth.verifyToken(res.body.data.token)).toMatchObject({ sub: '9223372036854775807', role });
    }
  });

  test('register/login exchanges and validation errors do not log credentials or session tokens', async () => {
    const logs = ['log', 'info', 'warn', 'error', 'debug'].map(method =>
      jest.spyOn(console, method).mockImplementation(() => {})
    );
    const email = freshEmail();
    const registered = await api.post('/api/v1/auth/register').send({ fullName: 'Logging User', email, password: PASSWORD });
    expect(registered.status).toBe(201);
    const loggedIn = await api.post('/api/v1/auth/login').send({ email, password: PASSWORD });
    expect(loggedIn.status).toBe(200);
    expectError(await api.post('/api/v1/auth/login').send({ email, password: 'WrongPass!123' }), 401, 'INVALID_CREDENTIALS');
    expectError(await api.post('/api/v1/auth/register').send({ email, password: PASSWORD }), 400, 'VALIDATION_ERROR');
    const output = inspect(logs.flatMap(log => log.mock.calls), { depth: null });
    for (const privateValue of [PASSWORD, 'WrongPass!123', registered.body.data.token, loggedIn.body.data.token, config.jwtSecret]) {
      expect(output.includes(privateValue)).toBe(false);
    }
  });
});

describe('US3/US4 real auth endpoints', () => {
  test.each([undefined, '', 'Bearer', 'Bearer ', 'Basic client-token', 'Bearer token extra'])(
    'me rejects missing/malformed Authorization without exposing protected data', async (header) => {
      const req = api.get('/api/v1/auth/me?role=admin&isActive=true');
      if (header !== undefined) req.set('Authorization', header);
      expectError(await req, 401, 'UNAUTHORIZED');
    }
  );

  test.each(['tampered', 'wrong-signature', 'expired'])(
    'me rejects a %s JWT using the real middleware chain', async (kind) => {
      const { user, token: original } = await fixture();
      let token;
      if (kind === 'tampered') {
        const parts = original.split('.');
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        claims.role = 'admin';
        parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
        token = parts.join('.');
      } else {
        const claims = { sub: user.id, role: user.role };
        if (kind === 'expired') claims.iat = Math.floor(Date.now() / 1000) - 3601;
        token = jwt.sign(claims,
          kind === 'wrong-signature' ? 'synthetic-wrong-signing-key-32-bytes' : config.jwtSecret,
          { algorithm: 'HS256', expiresIn: 3600 });
      }
      const res = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expectError(res, 401, 'UNAUTHORIZED');
      const { rows } = await query('SELECT role, is_active FROM users WHERE id = $1', [user.id]);
      expect(rows).toEqual([{ role: user.role, is_active: true }]);
    }
  );

  test('me preserves AUTH_CONFIG_ERROR instead of treating a server key failure as 401', async () => {
    const { token } = await fixture();
    config.jwtSecret = 'change-me';
    const res = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expectError(res, 500, 'AUTH_CONFIG_ERROR');
    expect(res.body.error.message.includes(token)).toBe(false);
    expect(res.body.error.message.includes(originalSecret)).toBe(false);
  });

  test('me forwards a DB reload failure as a generic 500 with no private DB details', async () => {
    const { token } = await fixture();
    const error = Object.assign(new Error('Synthetic DB reload failure'), {
      code: 'ECONNRESET', detail: 'private-database-diagnostic',
    });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Inject one failure only; all fixture and cleanup SQL still uses PostgreSQL.
    jest.spyOn(pool, 'query').mockRejectedValueOnce(error);
    const res = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expectError(res, 500, 'INTERNAL');
    expect(log).toHaveBeenCalledWith('Unexpected server error');
    expect(inspect(log.mock.calls, { depth: null }).includes(error.detail)).toBe(false);
    expect(JSON.stringify(res.body).includes(error.detail)).toBe(false);
    expect(JSON.stringify(res.body).includes(token)).toBe(false);
  });

  test('backend restoration preserves maximum BIGINT and revalidates the same session after DB changes', async () => {
    const { user, token } = await fixture('tenant', true, '9223372036854775807');
    const first = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.data.id).toBe('9223372036854775807');
    expect(first.body.data.role).toBe('tenant');
    await query('UPDATE users SET role = $1, full_name = $2 WHERE id = $3', ['landlord', 'Current Restored Name', user.id]);
    const restored = await api.get('/api/v1/auth/me?role=admin&isActive=false&userId=1')
      .set('Authorization', `Bearer ${token}`);
    expect(restored.status).toBe(200);
    expect(restored.body).toEqual({ success: true, data: {
      id: '9223372036854775807', fullName: 'Current Restored Name', email: user.email,
      role: 'landlord', isActive: true,
    } });
    await query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
    expectError(await api.get('/api/v1/auth/me?isActive=true').set('Authorization', `Bearer ${token}`), 403, 'INACTIVE_ACCOUNT');
    await query('UPDATE users SET is_active = true WHERE id = $1', [user.id]);
    expect((await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    expectError(await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`), 401, 'UNAUTHORIZED');
  });

  test('logout consistently acknowledges an unusable credential without JWT verification', async () => {
    const verify = jest.spyOn(auth, 'verifyToken');
    config.jwtSecret = 'change-me';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await api.post('/api/v1/auth/logout').set('Authorization', 'Bearer invalid-session');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { loggedOut: true } });
    }
    expect(verify).not.toHaveBeenCalled();
  });
});

test('validation and 404 responses do not reflect secret-shaped client keys or URL values', async () => {
  const marker = 'synthetic-private-client-value';
  const res = await api.post('/api/v1/auth/register').send({
    fullName: 'Validation User', email: freshEmail(), password: PASSWORD, [marker]: true,
  });
  expectError(res, 400, 'VALIDATION_ERROR');
  expect(res.body.error.message.includes(marker)).toBe(false);
  const missing = await api.get(`/api/v1/missing/${marker}?token=${marker}`);
  expectError(missing, 404, 'NOT_FOUND');
  expect(missing.body.error.message.includes(marker)).toBe(false);
});
