jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('../src/config', () => ({ databaseUrl: 'postgres://postgres:postgres@localhost:5432/nhatro_test' }));

const { execSync } = require('child_process');
const config = require('../src/config');
const setup = require('./globalSetup');
const originalDev = process.env.DATABASE_URL;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/nhatro';
  config.databaseUrl = 'postgres://postgres:postgres@localhost:5432/nhatro_test';
});
afterAll(() => {
  if (originalDev === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDev;
});

test('migration setup selects only the separate configured test database', async () => {
  await setup();
  expect(execSync).toHaveBeenCalledTimes(1);
  expect(execSync.mock.calls[0][1].env).toMatchObject({ NODE_ENV: 'test', DATABASE_URL: config.databaseUrl });
});

test.each([
  'postgres://postgres:postgres@localhost:5432/nhatro',
  'postgres://postgres:postgres@localhost:5432/other_database',
  'invalid-connection-synthetic-private-marker',
])('refuses an unsafe migration target before starting the CLI', async (databaseUrl) => {
  config.databaseUrl = databaseUrl;
  await expect(setup()).rejects.toThrow(/database|URL/i);
  expect(execSync).not.toHaveBeenCalled();
});

test('rejects a test/development database alias even with the nhatro_test name', async () => {
  process.env.DATABASE_URL = config.databaseUrl;
  await expect(setup()).rejects.toThrow(/separate/i);
  expect(execSync).not.toHaveBeenCalled();
});

test('invalid URL configuration errors disclose no raw connection string', async () => {
  const marker = 'synthetic-private-url';
  config.databaseUrl = `not-a-valid-url-${marker}`;
  let error;
  try { await setup(); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(Error);
  expect(error.message.includes(marker)).toBe(false);
  expect(execSync).not.toHaveBeenCalled();
});
