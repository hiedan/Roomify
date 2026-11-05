jest.mock('../src/config', () => ({ jwtSecret: 'unit-test-only-signing-key-6e701c3bbf24' }));

const bcrypt = require('bcryptjs');
const { createHmac, randomBytes } = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const AppError = require('../src/utils/AppError');
const { hashPassword, verifyPassword, issueToken, verifyToken } = require('../src/services/authService');

const SECRET = 'unit-test-only-signing-key-6e701c3bbf24';
const NOW = 1800000000;
const USER = { id: '9007199254740993', role: 'tenant' };
const validationError = { name: 'AppError', status: 400, code: 'VALIDATION_ERROR' };
const unauthorizedError = { name: 'AppError', status: 401, code: 'UNAUTHORIZED' };
const configurationError = { name: 'AppError', status: 500, code: 'AUTH_CONFIG_ERROR' };

function signClaims(claims = {}, options = {}) {
  return jwt.sign(
    { sub: USER.id, role: USER.role, iat: NOW, exp: NOW + 3600, ...claims },
    SECRET,
    { algorithm: 'HS256', ...options }
  );
}

describe('password helpers', () => {
  const password = '  MậtKhẩuA!1  ';
  let passwordHash;

  beforeAll(async () => {
    passwordHash = await hashPassword(password);
  });

  test('stores a salted bcrypt hash with cost 12, never plaintext', async () => {
    expect(passwordHash).not.toBe(password);
    expect(bcrypt.getRounds(passwordHash)).toBe(12);
    expect(await bcrypt.compare(password, passwordHash)).toBe(true);
    expect(await hashPassword(password)).not.toBe(passwordHash);
  });

  test('verifies the exact original password', async () => {
    expect(await verifyPassword(password, passwordHash)).toBe(true);
  });

  test.each([
    'WrongPass!123',
    password.trim(),
    password.toLowerCase(),
    password.normalize('NFD'),
  ])('rejects a changed password without normalizing it: %s', async (candidate) => {
    expect(await verifyPassword(candidate, passwordHash)).toBe(false);
  });

  test.each([
    'abcdefgh',
    'é'.repeat(8),
    '😀'.repeat(8),
    ' '.repeat(8),
    'a'.repeat(72),
    'é'.repeat(36),
    '😀'.repeat(18),
  ])('accepts valid character and UTF-8 byte boundaries: %s', async (candidate) => {
    const hash = await hashPassword(candidate);
    expect(await verifyPassword(candidate, hash)).toBe(true);
    expect(await bcrypt.compare(candidate, hash)).toBe(true);
  });

  test.each([
    undefined,
    null,
    12345678,
    {},
    [],
    Buffer.from('abcdefgh'),
    '',
    'a'.repeat(7),
    'é'.repeat(7),
    '😀'.repeat(4),
    'a'.repeat(73),
    'é'.repeat(37),
    '😀'.repeat(19),
  ])('rejects invalid passwords before hashing or comparing: %p', async (candidate) => {
    const hashSpy = jest.spyOn(bcrypt, 'hash');
    const compareSpy = jest.spyOn(bcrypt, 'compare');
    await expect(hashPassword(candidate)).rejects.toMatchObject(validationError);
    await expect(verifyPassword(candidate, passwordHash)).rejects.toMatchObject(validationError);
    expect(hashSpy).not.toHaveBeenCalled();
    expect(compareSpy).not.toHaveBeenCalled();
  });

  test('rejects an oversized password even if bcrypt would truncate it to a matching prefix', async () => {
    const prefix = 'é'.repeat(36);
    const hash = await hashPassword(prefix);
    await expect(verifyPassword(`${prefix}x`, hash)).rejects.toMatchObject(validationError);
  });

  test.each([undefined, null, 42, {}, '', 'not-a-bcrypt-hash'])(
    'returns false for a missing or malformed stored hash: %p',
    async (hash) => {
      expect(await verifyPassword(password, hash)).toBe(false);
    }
  );
});

describe('JWT helpers', () => {
  beforeEach(() => {
    config.jwtSecret = SECRET;
    jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  });

  test.each([
    [undefined, 3600],
    [false, 3600],
    [true, 604800],
  ])('issues an HS256 session for rememberMe=%p lasting %i seconds', (rememberMe, expiresIn) => {
    const session = issueToken(USER, rememberMe);
    expect(session).toEqual({ token: expect.any(String), expiresIn });
    expect(jwt.decode(session.token, { complete: true }).header.alg).toBe('HS256');
    expect(jwt.verify(session.token, SECRET, { algorithms: ['HS256'] })).toEqual({
      sub: USER.id,
      role: USER.role,
      iat: NOW,
      exp: NOW + expiresIn,
    });
    expect(verifyToken(session.token)).toEqual({
      sub: USER.id,
      role: USER.role,
      iat: NOW,
      exp: NOW + expiresIn,
    });
  });

  test('copies only safe claims, ignoring credentials and caller-supplied JWT options', () => {
    const user = Object.freeze({
      ...USER,
      email: 'synthetic@gmail.com',
      password: 'NeverCopyThis!123',
      password_hash: 'private-hash',
      passwordHash: 'private-hash',
      is_active: false,
      exp: NOW + 99999999,
      algorithm: 'none',
    });
    const { token } = issueToken(user);
    expect(jwt.decode(token)).toEqual({ sub: USER.id, role: USER.role, iat: NOW, exp: NOW + 3600 });
  });

  test.each(['tenant', 'landlord', 'admin'])('preserves the %s role snapshot without DB access', (role) => {
    expect(verifyToken(issueToken({ id: 123, role }).token).role).toBe(role);
  });

  test('keeps bigint account IDs as exact string subjects', () => {
    expect(verifyToken(issueToken(USER).token).sub).toBe(USER.id);
    expect(verifyToken(issueToken({ id: 123, role: 'tenant' }).token).sub).toBe('123');
  });

  test.each([null, 'true', 'false', 1, 0, {}, []])('rejects non-boolean rememberMe: %p', (rememberMe) => {
    expect(() => issueToken(USER, rememberMe)).toThrow(AppError);
    expect(() => issueToken(USER, rememberMe)).toThrow(expect.objectContaining(validationError));
  });

  test.each([
    null,
    undefined,
    {},
    { id: 0, role: 'tenant' },
    { id: -1, role: 'tenant' },
    { id: 1.5, role: 'tenant' },
    { id: Number.MAX_SAFE_INTEGER + 1, role: 'tenant' },
    { id: '1x', role: 'tenant' },
    { id: ' 1 ', role: 'tenant' },
    { id: '0', role: 'tenant' },
    { id: 1 },
    { id: 1, role: 'guest' },
  ])('rejects an invalid account claim source: %p', (user) => {
    expect(() => issueToken(user)).toThrow(expect.objectContaining(validationError));
  });

  test.each([
    undefined, null, '', '   ', 42,
    'dev-secret-change-me', 'change-me', 'changeme', 'change_me',
    'secret', 'jwt-secret', 'your-secret-key', 'your-jwt-secret',
    'your_jwt_secret', 'your_jwt_secret_here', 'default', 'default-secret',
    '  CHANGE-ME  ',
    ' '.repeat(32),
    'dev-secret-change-me'.padEnd(32, ' '),
    'change-me'.padStart(32, ' '),
  ])('refuses issuance and validation with an unsafe signing key: %p', (secret) => {
    const token = signClaims();
    config.jwtSecret = secret;
    expect(() => issueToken(USER)).toThrow(expect.objectContaining(configurationError));
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(configurationError));
  });

  test.each([
    ['single ASCII byte', 'a', 1],
    ['31 ASCII bytes', 'a'.repeat(31), 31],
    ['31 UTF-8 bytes using accented characters', `${'é'.repeat(15)}a`, 31],
    ['31 UTF-8 bytes using emoji', `${'😀'.repeat(7)}abc`, 31],
  ])('refuses issuance and validation with a short HS256 key: %s', (_label, secret, bytes) => {
    expect(Buffer.byteLength(secret, 'utf8')).toBe(bytes);
    // Sign externally with the same short key: verification must reject configuration,
    // even though the signature and claims would otherwise be valid.
    const token = jwt.sign({ sub: USER.id, role: USER.role }, secret, {
      algorithm: 'HS256', expiresIn: 3600,
    });
    config.jwtSecret = secret;
    expect(() => issueToken(USER)).toThrow(expect.objectContaining(configurationError));
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(configurationError));
  });

  test.each([
    ['32 ASCII bytes', 'a'.repeat(32), 32],
    ['33 ASCII bytes', 'a'.repeat(33), 33],
    ['32 UTF-8 bytes using accented characters', 'é'.repeat(16), 32],
    ['32 UTF-8 bytes using emoji', '😀'.repeat(8), 32],
    ['32 bytes including surrounding spaces', ` ${'b'.repeat(30)} `, 32],
  ])('accepts the HS256 key byte boundary: %s', (_label, secret, bytes) => {
    expect(Buffer.byteLength(secret, 'utf8')).toBe(bytes);
    config.jwtSecret = secret;
    const { token } = issueToken(USER);
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    expect(claims).toEqual({ sub: USER.id, role: USER.role, iat: NOW, exp: NOW + 3600 });
    expect(verifyToken(token)).toEqual(claims);
  });

  test('supports a key generated from 32 random bytes encoded as hex', () => {
    const secret = randomBytes(32).toString('hex');
    expect(Buffer.byteLength(secret, 'utf8')).toBe(64);
    config.jwtSecret = secret;
    const { token } = issueToken(USER);
    expect(jwt.verify(token, secret, { algorithms: ['HS256'] }).sub).toBe(USER.id);
    expect(verifyToken(token).sub).toBe(USER.id);
  });

  test('configuration errors expose neither the short key nor the supplied token', () => {
    const secret = 'private-key-too-short';
    const token = jwt.sign({ sub: USER.id, role: USER.role }, secret, {
      algorithm: 'HS256', expiresIn: 3600,
    });
    config.jwtSecret = secret;
    for (const action of [() => issueToken(USER), () => verifyToken(token)]) {
      let error;
      try {
        action();
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject(configurationError);
      expect(error.message).toBe('JWT signing key must be non-placeholder and at least 32 UTF-8 bytes');
      const details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      expect(details).not.toContain(secret);
      expect(details).not.toContain(token);
    }
  });

  test.each([
    [false, 3600],
    [true, 604800],
  ])('accepts just before expiry and rejects at/after expiry, rememberMe=%p', (rememberMe, ttl) => {
    const { token } = issueToken(USER, rememberMe);
    Date.now.mockReturnValue((NOW + ttl - 1) * 1000);
    expect(verifyToken(token).sub).toBe(USER.id);
    Date.now.mockReturnValue((NOW + ttl) * 1000);
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
    Date.now.mockReturnValue((NOW + ttl + 1) * 1000);
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test('rejects a token signed with another key', () => {
    const token = jwt.sign({ sub: USER.id, role: USER.role }, 'another-unit-test-key', {
      algorithm: 'HS256', expiresIn: 3600,
    });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test('rejects a tampered payload', () => {
    const [header, payload, signature] = issueToken(USER).token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    claims.sub = '999';
    const modified = Buffer.from(JSON.stringify(claims)).toString('base64url');
    expect(() => verifyToken(`${header}.${modified}.${signature}`)).toThrow(
      expect.objectContaining(unauthorizedError)
    );
  });

  test.each(['HS384', 'HS512', 'none'])('rejects the %s algorithm even with the configured key', (algorithm) => {
    const token = signClaims({}, { algorithm });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test.each([undefined, null, 42, {}, [], '', 'not-a-jwt', 'a.b.c', 'a.b', 'a.b.c.d', 'Bearer a.b.c'])(
    'rejects malformed token input: %p',
    (token) => {
      expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
    }
  );

  test('rejects a not-yet-valid token', () => {
    expect(() => verifyToken(signClaims({ nbf: NOW + 60 }))).toThrow(
      expect.objectContaining(unauthorizedError)
    );
  });

  test.each([
    { role: USER.role, iat: NOW, exp: NOW + 3600 },
    { sub: USER.id, iat: NOW, exp: NOW + 3600 },
    { sub: USER.id, role: USER.role, iat: NOW },
    { sub: '0', role: USER.role, iat: NOW, exp: NOW + 3600 },
    { sub: USER.id, role: 'guest', iat: NOW, exp: NOW + 3600 },
    { sub: USER.id, role: USER.role, iat: NOW + 7200, exp: NOW + 3600 },
    { sub: USER.id, role: USER.role, iat: NOW, exp: NOW + 3600.5 },
  ])('rejects signed tokens with missing or invalid required claims: %p', (claims) => {
    const token = jwt.sign(claims, SECRET, { algorithm: 'HS256' });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test('rejects a signed string payload', () => {
    const token = jwt.sign('not-an-account', SECRET, { algorithm: 'HS256' });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test.each(['{broken-json', 'null', 'true', '42', '[]', '"a string"'])(
    'rejects invalid JWT payload JSON or shape with UNAUTHORIZED: %s',
    (payload) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const input = `${header}.${Buffer.from(payload).toString('base64url')}`;
      const signature = createHmac('sha256', SECRET).update(input).digest('base64url');
      expect(() => verifyToken(`${input}.${signature}`)).toThrow(
        expect.objectContaining(unauthorizedError)
      );
    }
  );

  test('rejects a signed payload without an issue time', () => {
    const token = signClaims({}, { noTimestamp: true });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining(unauthorizedError));
  });

  test('returns generic errors without exposing the token or signing key', () => {
    const token = signClaims({}, { algorithm: 'HS384' });
    try {
      verifyToken(token);
      throw new Error('Expected invalid token to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject(unauthorizedError);
      expect(error.message).not.toContain(token);
      expect(error.message).not.toContain(SECRET);
    }
  });
});
