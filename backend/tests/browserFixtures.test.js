jest.mock('../src/config', () => ({ jwtSecret: 'synthetic-browser-fixture-secret' }));
jest.mock('../src/db', () => ({ query: jest.fn(), pool: { connect: jest.fn(), end: jest.fn() } }));
jest.mock('../src/databaseConfig', () => ({ assertTestTarget: jest.fn() }));
jest.mock('../src/services/authService', () => ({ hashPassword: jest.fn() }));

const { query, pool } = require('../src/db');
const { assertTestTarget } = require('../src/databaseConfig');
const { hashPassword } = require('../src/services/authService');
const fixtures = require('../../frontend/e2e/testDatabase.cjs');
const accountId = '9007199254740993';
let client;

beforeEach(() => {
  jest.resetAllMocks();
  client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  query.mockResolvedValue({ rows: [{ id: accountId }] });
  hashPassword.mockResolvedValue('synthetic-password-hash');
});

afterEach(async () => {
  // Retained IDs from an intentionally failed cleanup must not leak to another case.
  assertTestTarget.mockReset();
  client.query.mockResolvedValue({ rows: [] });
  pool.connect.mockResolvedValue(client);
  await fixtures.cleanup();
});

test('browser fixtures retain BIGINT IDs and clean only their own accounts and audits in one transaction', async () => {
  const account = await fixtures.account();
  expect(account.id).toBe(accountId);
  await fixtures.cleanup();
  expect(client.query.mock.calls).toEqual([
    ['BEGIN'],
    [expect.stringContaining('DELETE FROM admin_action_audits'), [[accountId]]],
    [expect.stringContaining('DELETE FROM users'), [[accountId]]],
    ['COMMIT'],
  ]);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.release).toHaveBeenCalledWith(undefined);
  await fixtures.cleanup();
  expect(pool.connect).toHaveBeenCalledTimes(1);
});

test('an unsafe browser target prevents both fixture creation and cleanup before any SQL', async () => {
  assertTestTarget.mockImplementation(() => { throw new Error('Unsafe browser target'); });
  await expect(fixtures.account()).rejects.toThrow('Unsafe browser target');
  await expect(fixtures.cleanup()).rejects.toThrow('Unsafe browser target');
  expect(query).not.toHaveBeenCalled();
  expect(pool.connect).not.toHaveBeenCalled();
  expect(hashPassword).not.toHaveBeenCalled();
});

test.each(['DELETE FROM users', 'COMMIT'])('a cleanup failure at %s rolls back, releases once and retains the tracked IDs', async statement => {
  await fixtures.account();
  const failure = new Error('Synthetic browser cleanup failure');
  client.query.mockImplementation(async sql => {
    if (sql.startsWith(statement)) throw failure;
    return { rows: [] };
  });
  await expect(fixtures.cleanup()).rejects.toBe(failure);
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.release).toHaveBeenCalledWith(undefined);
  client.query.mockResolvedValue({ rows: [] });
  await fixtures.cleanup();
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'), [[accountId]]);
  expect(pool.connect).toHaveBeenCalledTimes(2);
});

test('a failed rollback preserves the cleanup error and discards the broken client', async () => {
  await fixtures.account();
  const failure = new Error('Synthetic delete failure');
  const rollbackFailure = new Error('Synthetic rollback failure');
  client.query.mockImplementation(async sql => {
    if (sql.startsWith('DELETE')) throw failure;
    if (sql === 'ROLLBACK') throw rollbackFailure;
    return { rows: [] };
  });
  await expect(fixtures.cleanup()).rejects.toBe(failure);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.release).toHaveBeenCalledWith(rollbackFailure);
});

test('a failed checkout never queries or releases a nonexistent client and preserves tracked IDs', async () => {
  await fixtures.account();
  const failure = new Error('Synthetic checkout failure');
  pool.connect.mockRejectedValueOnce(failure);
  await expect(fixtures.cleanup()).rejects.toBe(failure);
  expect(client.query).not.toHaveBeenCalled();
  expect(client.release).not.toHaveBeenCalled();
  await fixtures.cleanup();
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'), [[accountId]]);
});
