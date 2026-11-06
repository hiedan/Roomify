jest.mock('pg', () => ({ Client: jest.fn() }));
jest.mock('node-pg-migrate', () => ({ default: jest.fn() }));
jest.mock('../scripts/schemaState', () => ({ migrationContracts: jest.fn(() => []), readSchemaState: jest.fn(), assertSchemaHistory: jest.fn() }));
const { Client } = require('pg');
const run = require('node-pg-migrate').default;
const schema = require('../scripts/schemaState');
const { migrate, inspect, acquireTestLease, releaseTestLease, safeMessage } = require('../scripts/database');
const { testEnvironment, applicationRef, testRef, directUrl } = require('./databaseEnvironment');
const original = { ...process.env };
let clients;

beforeEach(() => {
  jest.resetAllMocks();
  Object.assign(process.env, testEnvironment());
  for (const key of ['DATABASE_CA_CERT', 'TEST_DATABASE_CA_CERT', 'MIGRATION_DATABASE_URL', 'TEST_MIGRATION_DATABASE_URL']) delete process.env[key];
  clients = [];
  Client.mockImplementation(options => {
    const client = { options, connect: jest.fn().mockResolvedValue(), on: jest.fn(), end: jest.fn().mockResolvedValue(), query: jest.fn(async sql =>
      ({ rows: sql.includes('pg_try_advisory_lock') ? [{ acquired: true }] : [] })) };
    clients.push(client);
    return client;
  });
  schema.readSchemaState.mockResolvedValue({ tables: [], extensions: [], history: [] });
  run.mockResolvedValue([{ name: '001_initial' }]);
});
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});

test('migration supplies a connected verified-TLS client, public history and PostGIS search path to the existing runner', async () => {
  const result = await migrate();
  expect(result).toMatchObject({ environment: 'application', projectRef: applicationRef, applied: ['001_initial'] });
  expect(clients[0].options.ssl.rejectUnauthorized).toBe(true);
  expect(run).toHaveBeenCalledWith(expect.objectContaining({ dbClient: clients[0], schema: ['public', 'extensions'],
    migrationsSchema: 'public', migrationsTable: 'pgmigrations', direction: 'up', singleTransaction: true }));
  expect(clients[0].query.mock.calls.map(([sql]) => sql)).toContain('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions');
  expect(clients[0].end).toHaveBeenCalledTimes(1);
});

test('existing PostGIS in extensions is not recreated or moved', async () => {
  schema.readSchemaState.mockResolvedValue({ tables: [], history: [], extensions: [{ schema: 'extensions' }] });
  await migrate();
  expect(clients[0].query.mock.calls.map(([sql]) => sql).some(sql => sql.includes('CREATE EXTENSION'))).toBe(false);
});

test('schema/history disagreement prevents extension writes and the migration runner', async () => {
  schema.assertSchemaHistory.mockImplementation(() => { throw new Error('Schema drift'); });
  await expect(migrate()).rejects.toThrow('Schema drift');
  expect(run).not.toHaveBeenCalled();
  expect(clients[0].query.mock.calls.some(([sql]) => /^(CREATE|INSERT|UPDATE|DELETE)/.test(sql))).toBe(false);
  expect(clients[0].end).toHaveBeenCalledTimes(1);
});

test('a runtime/migration test-project mismatch is rejected before opening any connection', async () => {
  process.env.TEST_MIGRATION_DATABASE_URL = directUrl(applicationRef);
  await expect(migrate('test')).rejects.toThrow(/same Supabase project/);
  expect(Client).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});

test('test migration uses the same test project, a separate migration endpoint, and a coordination lease', async () => {
  process.env.TEST_MIGRATION_DATABASE_URL = directUrl(testRef);
  await migrate('test');
  expect(clients).toHaveLength(2);
  expect(clients[0].options.connectionString).toContain(`postgres.${testRef}`);
  expect(clients[1].options.connectionString).toContain(`db.${testRef}.supabase.co`);
  expect(clients.every(client => client.options.ssl.rejectUnauthorized)).toBe(true);
  expect(clients.every(client => client.end.mock.calls.length === 1)).toBe(true);
});

test('a competing test run fails before resets or migration and closes its attempted lease', async () => {
  Client.mockImplementationOnce(() => {
    const client = { connect: jest.fn().mockResolvedValue(), end: jest.fn().mockResolvedValue(), on: jest.fn(), query: jest.fn(async () => ({ rows: [{ acquired: false }] })) };
    clients.push(client);
    return client;
  });
  await expect(acquireTestLease()).rejects.toThrow(/another integration/);
  expect(run).not.toHaveBeenCalled();
  expect(clients[0].end).toHaveBeenCalledTimes(1);
});

test('runner failures still unlock/close migration and test coordination clients', async () => {
  const failure = new Error('Synthetic migration failure');
  run.mockRejectedValue(failure);
  await expect(migrate('test')).rejects.toBe(failure);
  expect(clients.every(client => client.end.mock.calls.length === 1)).toBe(true);
});

test('a migration client construction failure releases its already acquired test lease', async () => {
  const failure = new Error('Synthetic client construction failure');
  const createClient = Client.getMockImplementation();
  Client.mockImplementationOnce(createClient).mockImplementationOnce(() => { throw failure; });
  await expect(migrate('test')).rejects.toBe(failure);
  expect(clients).toHaveLength(1);
  expect(clients[0].query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock($1::bigint)', expect.any(Array));
  expect(clients[0].end).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
});

test('a borrowed test lease remains owned by the caller even when the runner fails', async () => {
  const lease = { query: jest.fn(), end: jest.fn() };
  const failure = new Error('Synthetic migration failure');
  run.mockRejectedValueOnce(failure);
  await expect(migrate('test', lease)).rejects.toBe(failure);
  expect(clients).toHaveLength(1);
  expect(clients[0].end).toHaveBeenCalledTimes(1);
  expect(lease.query).not.toHaveBeenCalled();
  expect(lease.end).not.toHaveBeenCalled();
});

test('a migration lock conflict closes the client without running or unlocking another migration', async () => {
  const createClient = Client.getMockImplementation();
  Client.mockImplementationOnce(options => {
    const client = createClient(options);
    client.query.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    return client;
  });
  await expect(migrate()).rejects.toThrow('Another Roomify migration is already running');
  expect(run).not.toHaveBeenCalled();
  expect(clients[0].query).toHaveBeenCalledTimes(1);
  expect(clients[0].end).toHaveBeenCalledTimes(1);
});

test('post-migration validation failures still release the migration and coordination locks', async () => {
  const failure = new Error('Synthetic post-migration schema drift');
  schema.assertSchemaHistory.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw failure; });
  await expect(migrate('test')).rejects.toBe(failure);
  expect(run).toHaveBeenCalledTimes(1);
  for (const client of clients) {
    expect(client.query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock($1::bigint)', expect.any(Array));
    expect(client.end).toHaveBeenCalledTimes(1);
  }
});

test('read-only application inspection does not migrate or enable extensions', async () => {
  const result = await inspect();
  expect(result.projectRef).toBe(applicationRef);
  expect(clients[0].query.mock.calls.map(([sql]) => sql)).toContain('BEGIN READ ONLY');
  expect(clients[0].query.mock.calls.some(([sql]) => /^(CREATE|INSERT|UPDATE|DELETE|TRUNCATE|GRANT)/.test(sql))).toBe(false);
  expect(run).not.toHaveBeenCalled();
});

test.each(['connect', 'query'])('inspection %s failures close the client and retain the original error', async operation => {
  const failure = new Error('Synthetic inspection failure');
  const createClient = Client.getMockImplementation();
  Client.mockImplementationOnce(options => {
    const client = createClient(options);
    client[operation].mockRejectedValueOnce(failure);
    return client;
  });
  await expect(inspect()).rejects.toBe(failure);
  expect(clients[0].end).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
});

test('lease cleanup closes a connection even when unlock fails', async () => {
  const lease = { query: jest.fn().mockRejectedValue(new Error('Lost connection')), end: jest.fn() };
  await expect(releaseTestLease(lease)).rejects.toThrow();
  expect(lease.end).toHaveBeenCalledTimes(1);
});

test('CLI errors never return raw driver credentials, query text or paths', () => {
  const failure = Object.assign(new Error('postgresql://private-password'), { code: 'ECONNREFUSED' });
  expect(safeMessage(failure)).toContain('ECONNREFUSED');
  expect(safeMessage(failure)).not.toContain('private-password');
});
