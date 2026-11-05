jest.mock('../src/db', () => ({ query: jest.fn(), pool: { connect: jest.fn(), end: jest.fn() } }));
jest.mock('../src/services/authService', () => ({
  ...jest.requireActual('../src/services/authService'),
  hashPassword: jest.fn(), verifyPassword: jest.fn(), issueToken: jest.fn(),
}));

const { ZodError } = require('zod');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const auth = require('../src/services/authService');
const { registerAccount, authenticateAccount } = require('../src/services/authAccountService');

const ROW = {
  id: '9007199254740993', full_name: 'Synthetic User', email: 'synthetic@gmail.com',
  role: 'tenant', is_active: true, password_hash: 'synthetic-hash', phone: 'private-phone',
};
const INPUT = { fullName: ' Synthetic User ', email: '  SYNTHETIC@GMAIL.COM ', password: '  ExactPass!123  ' };
let client;

beforeEach(() => {
  jest.clearAllMocks();
  client = { query: jest.fn().mockResolvedValue({ rows: [{ ...ROW }] }), release: jest.fn() };
  db.pool.connect.mockResolvedValue(client);
  db.query.mockResolvedValue({ rows: [{ ...ROW }] });
  auth.hashPassword.mockResolvedValue('synthetic-hash');
  auth.verifyPassword.mockResolvedValue(true);
  auth.issueToken.mockReturnValue({ token: 'synthetic-session', expiresIn: 3600 });
});

test('registers only an active tenant with normalized input and an exact string ID', async () => {
  const result = await registerAccount({ ...INPUT, rememberMe: true });
  expect(auth.hashPassword).toHaveBeenCalledWith(INPUT.password);
  const insert = client.query.mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
  expect(insert[0]).toMatch(/VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*'tenant',\s*true\)/i);
  expect(insert[0]).not.toMatch(/RETURNING[\s\S]*password/i);
  expect(insert[1]).toEqual(['Synthetic User', 'synthetic@gmail.com', 'synthetic-hash']);
  expect(auth.issueToken).toHaveBeenCalledWith(expect.objectContaining({ id: ROW.id, role: 'tenant' }), false);
  expect(client.query.mock.calls[0]).toEqual(['BEGIN']);
  expect(client.query.mock.calls.at(-1)).toEqual(['COMMIT']);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(result).toEqual({
    user: { id: ROW.id, fullName: ROW.full_name, email: ROW.email, role: ROW.role, isActive: true },
    token: 'synthetic-session', expiresIn: 3600,
  });
});

test.each([
  null, [], {}, { ...INPUT, fullName: ' A ' }, { ...INPUT, fullName: 'a'.repeat(101) },
  { ...INPUT, fullName: 42 }, { ...INPUT, email: 'bad@gmail.com.invalid' },
  { ...INPUT, email: 'user@yahoo.com' }, { ...INPUT, email: 'bad email@gmail.com' },
  { ...INPUT, email: `${'a'.repeat(246)}@gmail.com` }, { ...INPUT, email: null },
  { ...INPUT, password: 'a'.repeat(7) }, { ...INPUT, password: '😀'.repeat(4) },
  { ...INPUT, password: 'é'.repeat(37) }, { ...INPUT, password: 12345678 },
  { ...INPUT, rememberMe: 'true' }, { ...INPUT, role: 'admin' },
  { ...INPUT, is_active: true }, { ...INPUT, isActive: true }, { ...INPUT, extra: 'unsupported' },
])('rejects invalid registration before hashing or writing', async (input) => {
  await expect(registerAccount(input)).rejects.toBeInstanceOf(ZodError);
  expect(auth.hashPassword).not.toHaveBeenCalled();
  expect(db.pool.connect).not.toHaveBeenCalled();
});

test.each(['aa', 'a'.repeat(100), '😀'.repeat(50)])('accepts trimmed name boundaries', async (fullName) => {
  await registerAccount({ ...INPUT, fullName });
  expect(client.query.mock.calls[1][1][0]).toBe(fullName);
});

test('maps only the email unique constraint to EMAIL_CONFLICT and rolls back', async () => {
  client.query.mockResolvedValueOnce({ rows: [] })
    .mockRejectedValueOnce({ code: '23505', constraint: 'users_email_key' });
  await expect(registerAccount(INPUT)).rejects.toMatchObject({ status: 409, code: 'EMAIL_CONFLICT' });
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
  expect(auth.issueToken).not.toHaveBeenCalled();
  expect(client.release).toHaveBeenCalledTimes(1);
});

test.each([
  { code: '23505', constraint: 'users_pkey' }, { code: 'ECONNRESET' }, { code: '23502' },
])('preserves unexpected database errors and rolls back', async (error) => {
  client.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(error);
  await expect(registerAccount(INPUT)).rejects.toBe(error);
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('rolls back account creation if JWT issuance fails', async () => {
  const error = Object.assign(new Error('Synthetic signing failure'), { status: 500, code: 'AUTH_CONFIG_ERROR' });
  auth.issueToken.mockImplementation(() => { throw error; });
  await expect(registerAccount(INPUT)).rejects.toBe(error);
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
  expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('preserves the signing error and discards the connection if rollback also fails', async () => {
  const error = new Error('Synthetic signing failure');
  const rollbackError = new Error('Synthetic connection failure');
  auth.issueToken.mockImplementation(() => { throw error; });
  client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [ROW] })
    .mockRejectedValueOnce(rollbackError);
  await expect(registerAccount(INPUT)).rejects.toBe(error);
  expect(client.release).toHaveBeenCalledWith(rollbackError);
});

test('does not return a session if COMMIT fails', async () => {
  const error = new Error('Synthetic commit failure');
  client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [ROW] })
    .mockRejectedValueOnce(error).mockResolvedValueOnce({ rows: [] });
  await expect(registerAccount(INPUT)).rejects.toBe(error);
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('preserves connection failures', async () => {
  const error = new Error('Synthetic connection failure');
  db.pool.connect.mockRejectedValue(error);
  await expect(registerAccount(INPUT)).rejects.toBe(error);
  expect(auth.issueToken).not.toHaveBeenCalled();
});

test('normalizes login email, compares the original password and returns a safe profile', async () => {
  const result = await authenticateAccount({ email: INPUT.email, password: INPUT.password, rememberMe: true });
  expect(db.query.mock.calls[0][1]).toEqual(['synthetic@gmail.com']);
  expect(db.query.mock.calls[0][0]).toMatch(/WHERE email = \$1/);
  expect(auth.verifyPassword).toHaveBeenCalledWith(INPUT.password, ROW.password_hash);
  expect(auth.issueToken).toHaveBeenCalledWith(expect.objectContaining({ id: ROW.id }), true);
  expect(result.user).toEqual({
    id: ROW.id, fullName: ROW.full_name, email: ROW.email, role: ROW.role, isActive: true,
  });
});

test.each(['missing', 'wrong-password', 'inactive-wrong-password'])(
  'uses the same credentials error for %s', async (kind) => {
    if (kind === 'missing') db.query.mockResolvedValue({ rows: [] });
    else auth.verifyPassword.mockResolvedValue(false);
    if (kind === 'inactive-wrong-password') db.query.mockResolvedValue({ rows: [{ ...ROW, is_active: false }] });
    await expect(authenticateAccount({ email: ROW.email, password: INPUT.password }))
      .rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    expect(auth.issueToken).not.toHaveBeenCalled();
  }
);

test('returns INACTIVE_ACCOUNT only after valid credentials', async () => {
  db.query.mockResolvedValue({ rows: [{ ...ROW, is_active: false }] });
  await expect(authenticateAccount({ email: ROW.email, password: INPUT.password }))
    .rejects.toMatchObject({ status: 403, code: 'INACTIVE_ACCOUNT' });
  expect(auth.issueToken).not.toHaveBeenCalled();
});

test.each([
  {}, { email: ROW.email, password: 'short' },
  { email: 'user@yahoo.com', password: INPUT.password },
  { email: ROW.email, password: INPUT.password, rememberMe: 'true' },
  { email: ROW.email, password: INPUT.password, role: 'admin' },
])('validates login input even when the account is unknown', async (input) => {
  db.query.mockResolvedValue({ rows: [] });
  await expect(authenticateAccount(input)).rejects.toBeInstanceOf(ZodError);
  expect(db.query).not.toHaveBeenCalled();
});

test('does not convert login database failures into INVALID_CREDENTIALS', async () => {
  const error = new Error('Synthetic query failure');
  db.query.mockRejectedValue(error);
  await expect(authenticateAccount({ email: ROW.email, password: INPUT.password })).rejects.toBe(error);
});

test('unknown accounts perform a cost-12 password comparison and still never issue a session', async () => {
  db.query.mockResolvedValue({ rows: [] });
  // Even a hypothetical dummy-password match cannot authenticate a missing row.
  auth.verifyPassword.mockResolvedValue(true);
  await expect(authenticateAccount({ email: ROW.email, password: INPUT.password }))
    .rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  expect(auth.verifyPassword).toHaveBeenCalledTimes(1);
  const [password, hash] = auth.verifyPassword.mock.calls[0];
  expect(password).toBe(INPUT.password);
  expect(bcrypt.getRounds(hash)).toBe(12);
  expect(/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/.test(hash)).toBe(true);
  expect(auth.issueToken).not.toHaveBeenCalled();
});

describe('US1/US2 input boundaries through account flows', () => {
  test.each([
    ['ASCII minimum', 'a'.repeat(8)],
    ['Unicode minimum', '😀'.repeat(8)],
    ['ASCII byte maximum', 'a'.repeat(72)],
    ['accented byte maximum', 'é'.repeat(36)],
    ['emoji byte maximum', '😀'.repeat(18)],
    ['original spaces and case', '  ExactPass!123  '],
  ])('preserves a valid password at the %s boundary', async (_label, password) => {
    await registerAccount({ ...INPUT, password });
    await authenticateAccount({ email: ROW.email, password });
    expect(auth.hashPassword).toHaveBeenCalledWith(password);
    expect(auth.verifyPassword).toHaveBeenCalledWith(password, ROW.password_hash);
  });

  test.each([
    ['empty', ''], ['seven ASCII points', 'a'.repeat(7)],
    ['seven emoji points', '😀'.repeat(7)], ['73 ASCII bytes', 'a'.repeat(73)],
    ['74 accented bytes', 'é'.repeat(37)], ['76 emoji bytes', '😀'.repeat(19)],
    ['null', null], ['number', 12345678], ['object', {}], ['array', []],
  ])('rejects %s passwords in both account flows before any DB work', async (_label, password) => {
    await expect(registerAccount({ ...INPUT, password })).rejects.toBeInstanceOf(ZodError);
    await expect(authenticateAccount({ email: ROW.email, password })).rejects.toBeInstanceOf(ZodError);
    expect(auth.hashPassword).not.toHaveBeenCalled();
    expect(auth.verifyPassword).not.toHaveBeenCalled();
    expect(db.pool.connect).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each([254, 255])('accepts the normalized email length %i', async (length) => {
    const email = `${'a'.repeat(length - '@gmail.com'.length)}@gmail.com`;
    await registerAccount({ ...INPUT, email: `  ${email.toUpperCase()}  ` });
    await authenticateAccount({ email: `  ${email.toUpperCase()}  `, password: INPUT.password });
    expect(client.query.mock.calls[1][1][1]).toBe(email);
    expect(db.query.mock.calls[0][1]).toEqual([email]);
  });

  test.each([
    undefined, null, 42, {}, [], '', ' ', 'a@gmail.com.invalid',
    'a@yahoo.com', 'a..b@gmail.com', `${'a'.repeat(246)}@gmail.com`,
  ])('rejects invalid email shape/type/length in both flows', async (email) => {
    await expect(registerAccount({ ...INPUT, email })).rejects.toBeInstanceOf(ZodError);
    await expect(authenticateAccount({ email, password: INPUT.password })).rejects.toBeInstanceOf(ZodError);
    expect(db.pool.connect).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each([undefined, null, 42, {}, [], '', ' ', 'a', 'a'.repeat(101), '😀'.repeat(51)])(
    'rejects invalid name shape/type or UTF-16 length', async (fullName) => {
      await expect(registerAccount({ ...INPUT, fullName })).rejects.toBeInstanceOf(ZodError);
      expect(auth.hashPassword).not.toHaveBeenCalled();
      expect(db.pool.connect).not.toHaveBeenCalled();
    }
  );

  test.each([null, 'true', 'false', 0, 1, {}, []])(
    'rejects non-boolean rememberMe in both flows', async (rememberMe) => {
      await expect(registerAccount({ ...INPUT, rememberMe })).rejects.toBeInstanceOf(ZodError);
      await expect(authenticateAccount({ email: ROW.email, password: INPUT.password, rememberMe }))
        .rejects.toBeInstanceOf(ZodError);
      expect(db.pool.connect).not.toHaveBeenCalled();
      expect(db.query).not.toHaveBeenCalled();
    }
  );

  test.each([[undefined, false], [false, false], [true, true]])(
    'forwards login rememberMe=%p as %p to the shared token service', async (rememberMe, expected) => {
      await authenticateAccount({ email: ROW.email, password: INPUT.password, rememberMe });
      expect(auth.issueToken).toHaveBeenCalledWith(expect.objectContaining({ id: ROW.id }), expected);
    }
  );

  test.each([undefined, false, true])('registration keeps its standard session for rememberMe=%p', async (rememberMe) => {
    await registerAccount({ ...INPUT, rememberMe });
    expect(auth.issueToken).toHaveBeenCalledWith(expect.objectContaining({ role: 'tenant' }), false);
  });

  test.each(['id', 'role', 'is_active', 'isActive', 'password_hash', 'token', 'full_name'])(
    'does not accept client-selected %s in either public account flow', async (key) => {
      await expect(registerAccount({ ...INPUT, [key]: 'client-value' })).rejects.toBeInstanceOf(ZodError);
      await expect(authenticateAccount({ email: ROW.email, password: INPUT.password, [key]: 'client-value' }))
        .rejects.toBeInstanceOf(ZodError);
      expect(db.pool.connect).not.toHaveBeenCalled();
      expect(db.query).not.toHaveBeenCalled();
    }
  );

  test('preserves an unexpected token-signing failure during login', async () => {
    const error = Object.assign(new Error('Synthetic signing failure'), { code: 'AUTH_CONFIG_ERROR', status: 500 });
    auth.issueToken.mockImplementation(() => { throw error; });
    await expect(authenticateAccount({ email: ROW.email, password: INPUT.password })).rejects.toBe(error);
  });
});
