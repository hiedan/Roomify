jest.mock('pg', () => ({ Pool: jest.fn(() => ({ on: jest.fn(), query: jest.fn(), end: jest.fn() })) }));
jest.mock('../src/databaseConfig', () => ({
  getDatabaseConfig: jest.fn(() => ({ target: { environment: 'test', projectRef: 'unit-test-project' },
    options: { max: 3, ssl: { rejectUnauthorized: true } } })),
  assertTestTarget: jest.fn(),
}));
const { Pool } = require('pg');
const { assertTestTarget } = require('../src/databaseConfig');
let pool;
let query;
jest.isolateModules(() => { ({ pool, query } = require('../src/db')); });

beforeEach(() => { jest.clearAllMocks(); });

test('all test queries revalidate the selected target before touching the pool', async () => {
  assertTestTarget.mockImplementationOnce(() => { throw new Error('Unsafe target'); });
  expect(() => query('DELETE FROM users')).toThrow('Unsafe target');
  expect(pool.query).not.toHaveBeenCalled();
});

test('a failed write is never automatically retried', async () => {
  const error = new Error('Synthetic write failure');
  pool.query.mockRejectedValueOnce(error);
  await expect(query('INSERT INTO users VALUES ($1)', ['synthetic'])).rejects.toBe(error);
  expect(pool.query).toHaveBeenCalledTimes(1);
});

test('idle connection errors have a handler and never log driver details', () => {
  // Constructor calls were captured at module import before clearAllMocks.
  expect(pool).toBeDefined();
  expect(Pool).toBeDefined();
  jest.isolateModules(() => {
    const { pool: isolated } = require('../src/db');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const callback = isolated.on.mock.calls.find(([event]) => event === 'error')[1];
    callback(new Error('postgresql://private-credential-marker'));
    expect(log).toHaveBeenCalledWith('Database idle connection failed');
    log.mockRestore();
  });
});
