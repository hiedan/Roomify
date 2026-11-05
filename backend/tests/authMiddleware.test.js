jest.mock('../src/config', () => ({ jwtSecret: 'middleware-unit-test-key-e94a617580d2' }));
jest.mock('../src/db', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));

const jwt = require('jsonwebtoken');
const config = require('../src/config');
const db = require('../src/db');
const authService = require('../src/services/authService');
const AppError = require('../src/utils/AppError');
const { requireAuth } = require('../src/middlewares/auth');

const SECRET = 'middleware-unit-test-key-e94a617580d2';
const ROW = {
  id: '9007199254740993',
  full_name: 'Synthetic User',
  email: 'middleware-unit@gmail.com',
  role: 'tenant',
  is_active: true,
};

function tokenFor(id = ROW.id, role = 'tenant') {
  return authService.issueToken({ id, role }).token;
}

async function invoke(authorization, extra = {}) {
  const req = { headers: { authorization }, ...extra };
  const next = jest.fn();
  await requireAuth(req, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  return { req, next, error: next.mock.calls[0][0] };
}

function expectUnauthorized(result) {
  expect(result.error).toBeInstanceOf(AppError);
  expect(result.error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  expect(result.req.user).toBeUndefined();
}

beforeEach(() => {
  jest.clearAllMocks();
  config.jwtSecret = SECRET;
  db.query.mockResolvedValue({ rows: [{ ...ROW }] });
});

afterEach(() => jest.restoreAllMocks());

describe('requireAuth header and JWT validation', () => {
  test.each([
    undefined, null, '', ' ', 'Bearer', 'Bearer ', 'Bearer    ',
    'Basic abc', 'Bearer token extra', 'Bearer  abc', ' Bearer abc',
    'Bearer abc ', 'Bearer\tabc', 'Bearer abc\n', ['Bearer abc'], 42,
  ])('rejects a missing or malformed Authorization header: %p', async (header) => {
    const verify = jest.spyOn(authService, 'verifyToken');
    expectUnauthorized(await invoke(header));
    expect(verify).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  test('does not accept body, query, cookie or client profile credentials', async () => {
    const token = tokenFor();
    expectUnauthorized(await invoke(undefined, {
      body: { token, role: 'admin', isActive: true },
      query: { token, access_token: token },
      headers: { cookie: `token=${token}` },
    }));
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each(['not-a-jwt', 'a.b.c', 'a.b', 'a.b.c.d'])(
    'does not query DB for an invalid JWT: %s', async (token) => {
      const verify = jest.spyOn(authService, 'verifyToken');
      expectUnauthorized(await invoke(`Bearer ${token}`));
      expect(verify).toHaveBeenCalledWith(token);
      expect(db.query).not.toHaveBeenCalled();
    }
  );

  test.each(['expired', 'wrong-signature', 'wrong-algorithm', 'invalid-sub'])(
    'does not query DB for a %s token', async (kind) => {
      const payload = { sub: ROW.id, role: 'tenant' };
      if (kind === 'invalid-sub') payload.sub = "1' OR 1=1 --";
      const token = jwt.sign(payload, kind === 'wrong-signature' ? `${SECRET}-other` : SECRET, {
        algorithm: kind === 'wrong-algorithm' ? 'HS512' : 'HS256',
        expiresIn: kind === 'expired' ? -1 : 3600,
      });
      expectUnauthorized(await invoke(`Bearer ${token}`));
      expect(db.query).not.toHaveBeenCalled();
    }
  );
});

describe('requireAuth current user', () => {
  test('loads by parameterized string ID and exposes only the contract profile', async () => {
    const token = tokenFor(ROW.id, 'admin');
    // Even an unexpectedly over-broad DB result must not leak credentials.
    db.query.mockResolvedValue({ rows: [{
      ...ROW, password_hash: 'private-hash', passwordHash: 'private-hash',
      password: 'private-password', token, phone: 'private-phone',
    }] });
    const { req, next } = await invoke(`Bearer ${token}`, {
      body: { id: '2', role: 'admin', isActive: false },
      query: { id: '3', role: 'admin' },
    });
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: ROW.id, fullName: ROW.full_name, email: ROW.email, role: 'tenant', isActive: true,
    });
    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(params).toEqual([ROW.id]);
    expect(typeof params[0]).toBe('string');
    expect(sql).toMatch(/WHERE\s+id\s*=\s*\$1/i);
    expect(sql).not.toContain(ROW.id);
    expect(sql).not.toMatch(/password|\*/i);
    expect(sql).toMatch(/SELECT\s+id,\s*full_name,\s*email,\s*role,\s*is_active\s+FROM\s+users/i);
  });

  test('accepts the case-insensitive Bearer scheme', async () => {
    expect((await invoke(`bearer ${tokenFor()}`)).next).toHaveBeenCalledWith();
  });

  test('rejects a deleted user', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expectUnauthorized(await invoke(`Bearer ${tokenFor()}`));
  });

  test('rejects an inactive DB user despite active client state and admin token', async () => {
    db.query.mockResolvedValue({ rows: [{ ...ROW, is_active: false }] });
    const result = await invoke(`Bearer ${tokenFor(ROW.id, 'admin')}`, {
      body: { isActive: true, role: 'admin' },
    });
    expect(result.error).toBeInstanceOf(AppError);
    expect(result.error).toMatchObject({ status: 403, code: 'INACTIVE_ACCOUNT' });
    expect(result.req.user).toBeUndefined();
  });

  test('uses the new DB role on the next request with the same token', async () => {
    const token = tokenFor();
    expect((await invoke(`Bearer ${token}`)).req.user.role).toBe('tenant');
    db.query.mockResolvedValue({ rows: [{ ...ROW, role: 'landlord' }] });
    expect((await invoke(`Bearer ${token}`)).req.user.role).toBe('landlord');
    db.query.mockResolvedValue({ rows: [{ ...ROW, role: 'tenant' }] });
    expect((await invoke(`Bearer ${token}`)).req.user.role).toBe('tenant');
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  test.each(['1', '9007199254740993', '9223372036854775807'])(
    'preserves the exact valid BIGINT ID %s', async (id) => {
      db.query.mockResolvedValue({ rows: [{ ...ROW, id }] });
      const result = await invoke(`Bearer ${tokenFor(id)}`);
      expect(result.next).toHaveBeenCalledWith();
      expect(result.req.user.id).toBe(id);
      expect(db.query.mock.calls[0][1]).toEqual([id]);
    }
  );

  test.each(['9223372036854775808', '9999999999999999999', '10000000000000000000', '9'.repeat(200)])(
    'rejects out-of-range sub before querying PostgreSQL: %s', async (id) => {
      expectUnauthorized(await invoke(`Bearer ${tokenFor(id)}`));
      expect(db.query).not.toHaveBeenCalled();
    }
  );
});

describe('requireAuth error propagation', () => {
  test('preserves AUTH_CONFIG_ERROR without querying DB or exposing credentials', async () => {
    const token = tokenFor();
    config.jwtSecret = 'private-short-key';
    const result = await invoke(`Bearer ${token}`);
    expect(result.error).toMatchObject({ status: 500, code: 'AUTH_CONFIG_ERROR' });
    expect(result.req.user).toBeUndefined();
    expect(result.error.message).not.toContain(config.jwtSecret);
    expect(result.error.message).not.toContain(token);
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each(['ECONNREFUSED', '42501', '22P02'])(
    'passes the original database error (%s) to next', async (code) => {
      const error = Object.assign(new Error('Synthetic DB failure'), { code });
      db.query.mockRejectedValue(error);
      const result = await invoke(`Bearer ${tokenFor()}`);
      expect(result.error).toBe(error);
      expect(result.req.user).toBeUndefined();
    }
  );
});
