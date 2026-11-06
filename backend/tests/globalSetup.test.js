jest.mock('../scripts/database', () => ({ migrate: jest.fn(), acquireTestLease: jest.fn(), releaseTestLease: jest.fn(), safeMessage: jest.fn(() => 'Safe migration failure') }));
const tools = require('../scripts/database');
const setup = require('./globalSetup');
const teardown = require('./globalTeardown');
const { testEnvironment, applicationRef, sessionUrl } = require('./databaseEnvironment');
const original = { ...process.env };
const lease = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(process.env, testEnvironment());
  delete process.env.TEST_MIGRATION_DATABASE_URL;
  delete process.env.MIGRATION_DATABASE_URL;
  tools.acquireTestLease.mockResolvedValue(lease);
  tools.migrate.mockResolvedValue({ applied: [] });
  delete global.__ROOMIFY_TEST_LEASE;
});
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
  delete global.__ROOMIFY_TEST_LEASE;
});

test('setup validates the test project, holds its coordination lease through migrations and releases it at teardown', async () => {
  await setup();
  expect(tools.acquireTestLease).toHaveBeenCalledTimes(1);
  expect(tools.migrate).toHaveBeenCalledWith('test', lease);
  expect(tools.releaseTestLease).not.toHaveBeenCalled();
  await teardown();
  expect(tools.releaseTestLease).toHaveBeenCalledWith(lease);
});

test.each([
  { NODE_ENV: 'development' }, { TEST_DATABASE_URL: '' }, { TEST_SUPABASE_PROJECT_REF: '' },
  { TEST_DATABASE_URL: sessionUrl(applicationRef), TEST_SUPABASE_PROJECT_REF: applicationRef },
  { TEST_MIGRATION_DATABASE_URL: sessionUrl(applicationRef) },
])('unsafe setup cannot acquire a connection or migrate', async settings => {
  Object.assign(process.env, settings);
  await expect(setup()).rejects.toThrow();
  expect(tools.acquireTestLease).not.toHaveBeenCalled();
  expect(tools.migrate).not.toHaveBeenCalled();
});

test('migration failures release the lease and do not expose driver errors', async () => {
  tools.migrate.mockRejectedValue(new Error('Synthetic private connection string'));
  await expect(setup()).rejects.toThrow('Safe migration failure');
  expect(tools.releaseTestLease).toHaveBeenCalledWith(lease);
});

test('lease connection errors are sanitized before Jest can print them', async () => {
  tools.acquireTestLease.mockRejectedValueOnce(new Error('postgresql://synthetic-private-password'));
  await expect(setup()).rejects.toThrow('Safe migration failure');
  expect(tools.migrate).not.toHaveBeenCalled();
});
