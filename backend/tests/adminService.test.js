jest.mock('../src/db', () => ({ pool: { connect: jest.fn(), end: jest.fn() }, query: jest.fn() }));

const { ZodError } = require('zod');
const { pool, query } = require('../src/db');
const { findAccount, changeRole, changeStatus } = require('../src/services/adminService');

const ACTOR = { id: '9007199254740993', role: 'admin', is_active: true };
const TARGET = { id: '9223372036854775807', full_name: 'Synthetic Target', email: 'synthetic@gmail.com',
  role: 'tenant', is_active: true, password_hash: 'private-hash' };
let client;

beforeEach(() => {
  jest.clearAllMocks();
  client = { release: jest.fn(), query: jest.fn(async (sql, params) => {
    if (sql.startsWith('SELECT id FROM landlord_requests')) return { rows: [{ id: '11' }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ ...ACTOR }, { ...TARGET }] };
    if (sql.startsWith('UPDATE users SET role')) return { rows: [{ ...TARGET, role: params[0] }] };
    if (sql.startsWith('UPDATE users SET is_active')) return { rows: [{ ...TARGET, is_active: params[0] }] };
    return { rows: [] };
  }) };
  pool.connect.mockResolvedValue(client);
});

test.each([
  ['9007199254740993', 'id', '9007199254740993'],
  [' 9223372036854775807 ', 'id', '9223372036854775807'],
  [' SYNTHETIC@GMAIL.COM ', 'email', 'synthetic@gmail.com'],
])('lookup parameterizes an exact ID or normalized email without rounding: %s', async (identifier, field, value) => {
  query.mockResolvedValueOnce({ rows: [TARGET] });
  expect(await findAccount({ identifier })).toEqual({ user: {
    id: TARGET.id, fullName: TARGET.full_name, email: TARGET.email, role: TARGET.role, isActive: TARGET.is_active,
  } });
  expect(query).toHaveBeenCalledWith(`SELECT id, full_name, email, role, is_active FROM users WHERE ${field} = $1`, [value]);
  expect(pool.connect).not.toHaveBeenCalled();
});

test.each(['0', '01', '9223372036854775808', 'not-an-email', "x@gmail.com' OR 1=1 --", 'x'.repeat(256)])('lookup rejects malformed identifiers before SQL: %s', async identifier => {
  await expect(findAccount({ identifier })).rejects.toBeInstanceOf(ZodError);
  expect(query).not.toHaveBeenCalled();
});

test('lookup reports an unknown account without echoing its identifier', async () => {
  query.mockResolvedValueOnce({ rows: [] });
  await expect(findAccount({ identifier: 'unknown@gmail.com' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
});

test('legacy role assignment cannot grant landlord access without a pending application', async () => {
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => sql.startsWith('SELECT id FROM landlord_requests')
    ? Promise.resolve({ rows: [] }) : original(sql, params));
  await expect(changeRole(ACTOR.id, TARGET.id, { role: 'landlord' }))
    .rejects.toMatchObject({ status: 409, code: 'LANDLORD_REQUEST_REQUIRED' });
  expect(client.query.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
});

test.each([
  ['role', 'landlord', 'role_change', 'tenant', 'landlord'],
  ['status', false, 'account_disable', 'true', 'false'],
])('changes %s and audits on the same locked transaction', async (kind, value, action, previous, nextValue) => {
  const result = kind === 'role'
    ? await changeRole(ACTOR.id, TARGET.id, { role: value })
    : await changeStatus(ACTOR.id, TARGET.id, { isActive: value });
  expect(client.query.mock.calls[0]).toEqual(['BEGIN']);
  const lock = client.query.mock.calls[1];
  expect(lock[0]).toMatch(/ORDER BY id FOR UPDATE/);
  expect(lock[1]).toEqual([[ACTOR.id, TARGET.id]]);
  const audit = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO admin_action_audits'));
  expect(audit[1]).toEqual([ACTOR.id, TARGET.id, action, previous, nextValue]);
  expect(audit[0]).not.toMatch(/password|token/i);
  expect(client.query.mock.calls.at(-1)).toEqual(['COMMIT']);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(query).not.toHaveBeenCalled();
  expect(result.changed).toBe(true);
  expect(result.user).toEqual({ id: TARGET.id, fullName: TARGET.full_name, email: TARGET.email,
    role: kind === 'role' ? value : 'tenant', isActive: kind === 'status' ? value : true });
});

test.each([
  ['role', { role: 'tenant' }], ['status', { isActive: true }],
])('a %s no-op is authorized and committed without mutation/audit', async (kind, body) => {
  const result = await (kind === 'role' ? changeRole : changeStatus)(ACTOR.id, TARGET.id, body);
  expect(result.changed).toBe(false);
  expect(client.query.mock.calls.map(([sql]) => sql).some(sql => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
  expect(client.query.mock.calls.at(-1)).toEqual(['COMMIT']);
});

test.each([
  [undefined, 401, 'UNAUTHORIZED'],
  [{ ...ACTOR, role: 'tenant' }, 403, 'FORBIDDEN'],
  [{ ...ACTOR, is_active: false }, 403, 'INACTIVE_ACCOUNT'],
])('re-checks actor authorization from the locked rows', async (actor, status, code) => {
  client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: actor ? [actor, TARGET] : [TARGET] });
  await expect(changeRole(ACTOR.id, TARGET.id, { role: 'landlord' })).rejects.toMatchObject({ status, code });
  expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
  expect(client.query.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
});

test.each(['role', 'status'])('never mutates an admin target in a %s request', async (kind) => {
  client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [ACTOR, { ...TARGET, role: 'admin' }] });
  await expect((kind === 'role' ? changeRole : changeStatus)(ACTOR.id, TARGET.id,
    kind === 'role' ? { role: 'landlord' } : { isActive: true }))
    .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  expect(client.query.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
});

test('missing target uses NOT_FOUND after actor authorization', async () => {
  client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [ACTOR] });
  await expect(changeStatus(ACTOR.id, TARGET.id, { isActive: false }))
    .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
});

test.each([undefined, null, 1, '0', '-1', '01', '1.5', '9223372036854775808', "1' OR 1=1 --"])(
  'rejects invalid target IDs before DB work', async (id) => {
    await expect(changeRole(ACTOR.id, id, { role: 'landlord' })).rejects.toBeInstanceOf(ZodError);
    expect(pool.connect).not.toHaveBeenCalled();
  }
);

test.each([undefined, null, {}, { role: 'admin' }, { role: 'guest' }, { role: 1 },
  { role: 'landlord', isActive: true }, { role: 'landlord', actorId: ACTOR.id }])(
  'strictly validates role payloads before connecting', async (body) => {
    await expect(changeRole(ACTOR.id, TARGET.id, body)).rejects.toBeInstanceOf(ZodError);
    expect(pool.connect).not.toHaveBeenCalled();
  }
);

test.each([undefined, null, {}, { isActive: 'false' }, { isActive: 0 }, { isActive: null },
  { isActive: [] }, { isActive: false, role: 'tenant' }])(
  'strictly validates boolean status payloads before connecting', async (body) => {
    await expect(changeStatus(ACTOR.id, TARGET.id, body)).rejects.toBeInstanceOf(ZodError);
    expect(pool.connect).not.toHaveBeenCalled();
  }
);

test.each(['UPDATE users', 'INSERT INTO admin_action_audits', 'COMMIT'])(
  'rolls back and preserves a %s failure', async (at) => {
    const error = new Error('Synthetic transaction failure');
    const original = client.query.getMockImplementation();
    client.query.mockImplementation((sql, params) => sql.startsWith(at) ? Promise.reject(error) : original(sql, params));
    await expect(changeRole(ACTOR.id, TARGET.id, { role: 'landlord' })).rejects.toBe(error);
    expect(client.query.mock.calls.at(-1)).toEqual(['ROLLBACK']);
    expect(client.release).toHaveBeenCalledTimes(1);
  }
);

test('preserves the original failure and discards a connection whose rollback fails', async () => {
  const originalError = new Error('Synthetic insert failure');
  const rollbackError = new Error('Synthetic rollback failure');
  const original = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => {
    if (sql.startsWith('INSERT')) return Promise.reject(originalError);
    if (sql === 'ROLLBACK') return Promise.reject(rollbackError);
    return original(sql, params);
  });
  await expect(changeStatus(ACTOR.id, TARGET.id, { isActive: false })).rejects.toBe(originalError);
  expect(client.release).toHaveBeenCalledWith(rollbackError);
});

test('preserves connection failures', async () => {
  const error = new Error('Synthetic connect failure');
  pool.connect.mockRejectedValue(error);
  await expect(changeRole(ACTOR.id, TARGET.id, { role: 'landlord' })).rejects.toBe(error);
});

test.each([undefined, null, 1, '0', '9223372036854775808'])(
  'invalid actor identity fails before acquiring a connection', async (actorId) => {
    await expect(changeRole(actorId, TARGET.id, { role: 'landlord' }))
      .rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(pool.connect).not.toHaveBeenCalled();
  }
);
