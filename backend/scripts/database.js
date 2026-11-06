const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('../src/config');
const { getDatabaseConfig, assertTestTarget, configurationError } = require('../src/databaseConfig');
const { migrationContracts, readSchemaState, assertSchemaHistory } = require('./schemaState');

const TEST_LOCK = '61438100920261106';
const MIGRATION_LOCK = '61438100920261107';
const directory = path.resolve(__dirname, '../migrations');
function migrationFiles() {
  return fs.readdirSync(directory).filter(name => /^\d+_.*\.js$/.test(name)).sort()
    .map(name => ({ name: name.slice(0, -3), path: path.join(directory, name) }));
}

async function acquireTestLease() {
  assertTestTarget();
  const { options } = getDatabaseConfig('test');
  const client = new Client(options);
  client.on('error', () => {
    // Continuing resets after losing the coordinating session would be unsafe.
    throw new Error('The Roomify-Test coordination connection was lost');
  });
  try {
    await client.connect();
    const result = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS acquired', [TEST_LOCK]);
    if (!result.rows[0].acquired) throw configurationError('Roomify-Test is in use by another integration/E2E/migration run');
    return client;
  } catch (error) { await client.end().catch(() => {}); throw error; }
}

async function releaseTestLease(lease) {
  if (!lease) return;
  try { await lease.query('SELECT pg_advisory_unlock($1::bigint)', [TEST_LOCK]); }
  finally { await lease.end(); }
}

async function migrate(environment = 'application', heldTestLease) {
  if (environment === 'test') assertTestTarget();
  const { options, target } = getDatabaseConfig(environment, 'migration');
  const lease = environment === 'test' && !heldTestLease ? await acquireTestLease() : null;
  let client;
  let migrationLocked = false;
  try {
    // Own the lease even if constructing the migration client fails.
    client = new Client(options);
    client.on('error', () => {}); // Active failures reject their query; never print a raw pg error.
    await client.connect();
    const lock = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS acquired', [MIGRATION_LOCK]);
    if (!lock.rows[0].acquired) throw configurationError('Another Roomify migration is already running');
    migrationLocked = true;
    const contracts = migrationContracts(migrationFiles());
    const state = await readSchemaState(client);
    assertSchemaHistory(state, contracts);
    // Keep historical migrations byte-for-byte. Install PostGIS before their
    // IF NOT EXISTS statement, so new Supabase databases use extensions.
    if (!state.extensions.length) {
      await client.query('CREATE SCHEMA IF NOT EXISTS extensions');
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions');
    }
    const run = require('node-pg-migrate').default;
    const silent = () => {};
    const applied = await run({ dbClient: client, dir: directory, direction: 'up',
      schema: ['public', 'extensions'], migrationsSchema: 'public', migrationsTable: 'pgmigrations',
      checkOrder: true, singleTransaction: true,
      logger: { info: silent, warn: silent, error: silent },
    });
    assertSchemaHistory(await readSchemaState(client), contracts);
    return { environment, projectRef: target.projectRef, applied: applied.map(item => item.name) };
  } finally {
    if (migrationLocked) await client.query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK]).catch(() => {});
    if (client) await client.end().catch(() => {});
    if (lease) await releaseTestLease(lease);
  }
}

async function inspect(environment = 'application') {
  const { options, target } = getDatabaseConfig(environment);
  const client = new Client(options);
  client.on('error', () => {});
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const connection = await client.query(`SELECT current_database() AS database, current_user AS role,
      current_setting('search_path') AS search_path, (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls`);
    const state = await readSchemaState(client);
    assertSchemaHistory(state, migrationContracts(migrationFiles()));
    const postgis = state.extensions.length ? (await client.query(
      'SELECT PostGIS_Version() AS version, ST_SRID(ST_SetSRID(ST_MakePoint(106.69, 10.77), 4326)) AS srid'
    )).rows[0] : null;
    const permissions = await client.query(`SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
      has_table_privilege(current_user, c.oid, 'SELECT') AS can_select,
      has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
      has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update,
      has_table_privilege(current_user, c.oid, 'DELETE') AS can_delete
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`);
    const amenities = state.tables.includes('amenities') ? (await client.query('SELECT icon FROM public.amenities ORDER BY icon')).rows : [];
    await client.query('COMMIT');
    return { environment, projectRef: target.projectRef, mode: target.mode,
      connection: connection.rows[0], ...state, postgis, permissions: permissions.rows, amenities };
  } finally { await client.end().catch(() => {}); }
}

function safeMessage(error) {
  if (error.code === 'DATABASE_CONFIG_ERROR') return error.message;
  const code = /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'UNKNOWN';
  return `Database operation failed (${code}); check connection, CA, permissions and schema without sharing credentials`;
}

if (require.main === module) {
  const [command, ...flags] = process.argv.slice(2);
  const environment = flags.includes('--test') ? 'test' : 'application';
  if (environment === 'test') process.env.NODE_ENV = 'test';
  Promise.resolve().then(() => {
    if (flags.some(flag => flag !== '--test')) throw configurationError('Unsupported database command option');
    if (command === 'migrate') return migrate(environment);
    if (command === 'check') return inspect(environment);
    throw configurationError('Use database.js migrate|check [--test]');
  }).then(result => {
    // This contains schema/identity metadata only, never URLs, passwords or rows.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  }).catch(error => {
    // eslint-disable-next-line no-console
    console.error(safeMessage(error));
    process.exitCode = 1;
  });
}

module.exports = { migrate, inspect, acquireTestLease, releaseTestLease, safeMessage };
