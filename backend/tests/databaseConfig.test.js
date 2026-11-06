const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const tls = require('node:tls');
const { identifyConnection, assertTestTarget, getDatabaseConfig } = require('../src/databaseConfig');
const { applicationRef, testRef, poolerHost, sessionUrl, directUrl, testEnvironment } = require('./databaseEnvironment');

test('same database name, schema and pooler host still identify two independent Supabase projects', () => {
  const env = testEnvironment();
  const app = getDatabaseConfig('application', 'runtime', env);
  const test = getDatabaseConfig('test', 'runtime', env);
  expect(app.target.host).toBe(test.target.host);
  expect(app.target.database).toBe('postgres');
  expect(test.target.database).toBe('postgres');
  expect(app.target.projectRef).toBe(applicationRef);
  expect(test.target.projectRef).toBe(testRef);
});

test('Direct and Session endpoints of the same project normalize to the same identity', () => {
  expect(identifyConnection(directUrl(testRef)).projectRef).toBe(identifyConnection(sessionUrl(testRef)).projectRef);
  const custom = sessionUrl(testRef).replace('postgres.', 'roomify_backend.');
  expect(identifyConnection(custom).projectRef).toBe(testRef);
});

test.each([
  { TEST_DATABASE_URL: '' }, { TEST_SUPABASE_PROJECT_REF: '' }, { SUPABASE_PROJECT_REF: '' },
  { NODE_ENV: 'production' }, { DATABASE_URL: '' },
  { TEST_DATABASE_URL: sessionUrl(applicationRef) },
  { TEST_DATABASE_URL: directUrl(applicationRef), TEST_SUPABASE_PROJECT_REF: applicationRef },
  { TEST_DATABASE_URL: sessionUrl(applicationRef), TEST_SUPABASE_PROJECT_REF: applicationRef },
  { TEST_MIGRATION_DATABASE_URL: directUrl(applicationRef) },
  { TEST_MIGRATION_DATABASE_URL: sessionUrl(testRef).replace(/\/postgres$/, '/another') },
])('rejects missing, aliased or contradictory test identities', settings => {
  expect(() => assertTestTarget({ ...testEnvironment(), ...settings })).toThrow();
});

test('a stale active pool identity cannot follow a changed test environment', () => {
  const env = testEnvironment();
  const connection = getDatabaseConfig('test', 'runtime', env);
  expect(() => assertTestTarget(env, { ...connection.target, projectRef: applicationRef })).toThrow(/active test connection/);
});

test('runtime application settings do not require test or migration credentials', () => {
  expect(getDatabaseConfig('application', 'runtime', { DATABASE_URL: sessionUrl(applicationRef), SUPABASE_PROJECT_REF: applicationRef,
    TEST_DATABASE_URL: 'invalid', MIGRATION_DATABASE_URL: 'invalid' }).target.projectRef).toBe(applicationRef);
});

test('migration uses its own endpoint and CA settings for the same test project', () => {
  const env = { ...testEnvironment(), TEST_MIGRATION_DATABASE_URL: directUrl(testRef) };
  expect(getDatabaseConfig('test', 'runtime', env).target.mode).toBe('session');
  expect(getDatabaseConfig('test', 'migration', env).target.mode).toBe('direct');
});

test.each([
  'postgresql://user:synthetic-secret@localhost:5432/postgres',
  'postgresql://user:synthetic-secret@127.0.0.1/postgres',
  sessionUrl(testRef).replace(':5432/', ':6543/'), directUrl(testRef).replace(':5432/', ':6543/'),
  sessionUrl(testRef).replace(`postgres.${testRef}`, 'postgres'),
  directUrl(testRef).replace('postgres:', `postgres.${applicationRef}:`),
  sessionUrl(testRef).replace(poolerHost, `${poolerHost}.attacker.example`),
  directUrl(testRef).replace('/postgres', '/'),
  sessionUrl(testRef, '?host=db.aaaaaaaaaaaaaaaaaaaa.supabase.co'),
  sessionUrl(testRef, '?sslmode=disable'), sessionUrl(testRef, '?sslmode=no-verify'),
  sessionUrl(testRef, '?ssl=true'), sessionUrl(testRef, '?sslrootcert=synthetic-private-file'),
  sessionUrl(testRef, '?sslmode=require&sslmode=verify-full'),
  sessionUrl(testRef, '?options=-csearch_path=roomify_test'),
])('refuses unknown endpoints, transaction pooling and URL overrides', value => {
  expect(() => identifyConnection(value)).toThrow();
});

test('removes URL SSL hints so pg cannot replace CA/hostname verification', () => {
  const connection = getDatabaseConfig('test', 'runtime', { ...testEnvironment(), TEST_DATABASE_URL: sessionUrl(testRef, '?sslmode=require') });
  expect(new URL(connection.options.connectionString).search).toBe('');
  expect(connection.options.ssl).toMatchObject({ rejectUnauthorized: true, servername: poolerHost });
  expect(connection.options.options).toBe('-c search_path=public,extensions');
  expect(connection.options.max).toBe(3);
  expect(connection.options.connectionTimeoutMillis).toBe(10000);
});

test.each(['0', '-1', '100', 'not-a-number', '3.5'])('invalid pool settings fail safely: %s', value => {
  expect(() => getDatabaseConfig('test', 'runtime', { ...testEnvironment(), TEST_DATABASE_POOL_MAX: value })).toThrow(/TEST_DATABASE_POOL_MAX/);
});

test('CA files are environment-specific, preserve system roots, and cannot disable verification', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'roomify-ca-unit-'));
  const certificate = path.join(directory, 'test-ca.pem');
  fs.writeFileSync(certificate, tls.rootCertificates[0]);
  try {
    const env = { ...testEnvironment(), TEST_DATABASE_CA_CERT: certificate, DATABASE_CA_CERT: 'nonexistent-app-ca' };
    const connection = getDatabaseConfig('test', 'runtime', env);
    expect(connection.options.ssl.rejectUnauthorized).toBe(true);
    expect(connection.options.ssl.ca).toContain(tls.rootCertificates[0]);
    expect(connection.options.ssl.ca.length).toBeGreaterThan(1);
    fs.writeFileSync(certificate, 'invalid-private-marker');
    expect(() => getDatabaseConfig('test', 'runtime', env)).toThrow('TEST_DATABASE_CA_CERT must point to a readable PEM CA certificate');
  } finally { fs.unlinkSync(certificate); fs.rmdirSync(directory); }
});

test.each(['invalid-private-marker', 'postgresql://user:private-marker@localhost/postgres', sessionUrl(testRef, '?password=private-marker')])(
  'configuration exceptions never expose rejected URLs or credentials', value => {
    let error;
    try { identifyConnection(value); } catch (caught) { error = caught; }
    expect(error.code).toBe('DATABASE_CONFIG_ERROR');
    expect(String(error.stack)).not.toMatch(/private-marker|synthetic-unit-password/);
  }
);
