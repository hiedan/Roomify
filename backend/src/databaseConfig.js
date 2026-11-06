const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');

function configurationError(message) {
  const error = new Error(message);
  error.code = 'DATABASE_CONFIG_ERROR';
  return error;
}

function projectReference(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9]{20}$/.test(value)) {
    throw configurationError(`${label} must be a Supabase project reference (20 lowercase letters/digits)`);
  }
  return value;
}

// Supabase Direct: db.<ref>.supabase.co / Session pooler: <role>.<ref>@<pooler>:5432.
// https://supabase.com/docs/guides/database/connecting-to-postgres
function identifyConnection(value, label = 'DATABASE_URL') {
  let url;
  try {
    if (typeof value !== 'string' || !value.trim()) throw new Error();
    url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.hash) throw new Error();
    decodeURIComponent(url.password);
  } catch { throw configurationError(`${label} must be a complete PostgreSQL connection URL copied from Supabase Connect`); }
  const username = decodeSafely(url.username, label);
  const database = decodeSafely(url.pathname.slice(1), label);
  if (!database || /[\s/]/.test(database) || [...database].some(character => character.charCodeAt(0) < 32) || (url.port && url.port !== '5432')) {
    throw configurationError(`${label} requires a database and Direct or Session mode on port 5432`);
  }
  const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
  const shared = /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
  let projectRef;
  let mode;
  if (direct && /^[a-zA-Z_][a-zA-Z0-9_$-]*$/.test(username)) {
    projectRef = direct[1];
    mode = 'direct';
  } else if (shared) {
    const match = /^([a-zA-Z_][a-zA-Z0-9_$-]*)\.([a-z0-9]{20})$/.exec(username);
    if (match) { projectRef = match[2]; mode = 'session'; }
  }
  if (!projectRef) throw configurationError(`${label} has an unrecognized or contradictory Supabase endpoint/username`);
  // pg-connection-string permits URL parameters to override host/user/TLS.
  // Accept only these TLS hints, remove them and supply verified TLS ourselves.
  for (const [key, setting] of url.searchParams) {
    if (key !== 'sslmode' || !['require', 'verify-full'].includes(setting)) {
      throw configurationError(`${label} must not contain connection overrides; configure CA with DATABASE_CA_CERT or TEST_DATABASE_CA_CERT`);
    }
  }
  if (url.searchParams.getAll('sslmode').length > 1) throw configurationError(`${label} has duplicate TLS settings`);
  url.search = '';
  return { projectRef, database, mode, host: url.hostname, connectionString: url.toString() };
}

function decodeSafely(value, label) {
  try { return decodeURIComponent(value); }
  catch { throw configurationError(`${label} contains invalid URL encoding`); }
}

function resolveTarget(environment, purpose, env) {
  if (!['application', 'test'].includes(environment) || !['runtime', 'migration'].includes(purpose)) {
    throw configurationError('Unknown database environment or purpose');
  }
  const prefix = environment === 'test' ? 'TEST_' : '';
  const reference = projectReference(env[`${prefix}SUPABASE_PROJECT_REF`], `${prefix}SUPABASE_PROJECT_REF`);
  const runtime = identifyConnection(env[`${prefix}DATABASE_URL`], `${prefix}DATABASE_URL`);
  if (runtime.projectRef !== reference) throw configurationError(`${prefix}DATABASE_URL does not match ${prefix}SUPABASE_PROJECT_REF`);
  const migrationKey = `${prefix}MIGRATION_DATABASE_URL`;
  const needsMigration = purpose === 'migration' || environment === 'test';
  const migration = needsMigration && env[migrationKey] ? identifyConnection(env[migrationKey], migrationKey) : runtime;
  if (migration.projectRef !== reference || migration.database !== runtime.database) {
    throw configurationError(`${migrationKey} and ${prefix}DATABASE_URL must identify the same Supabase project and database`);
  }
  return { ...(purpose === 'migration' ? migration : runtime), environment };
}

function assertTestTarget(env = process.env, actualTarget) {
  if (env.NODE_ENV !== 'test') throw configurationError('Database test operations require NODE_ENV=test');
  const application = resolveTarget('application', 'runtime', env);
  const test = resolveTarget('test', 'runtime', env);
  if (application.projectRef === test.projectRef) throw configurationError('Roomify-Test must be a separate Supabase project from Roomify');
  if (actualTarget && (actualTarget.environment !== 'test' || actualTarget.projectRef !== test.projectRef || actualTarget.database !== test.database)) {
    throw configurationError('The active test connection differs from the validated Roomify-Test target');
  }
  return test;
}

function integerSetting(value, fallback, label, maximum) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > maximum) {
    throw configurationError(`${label} is outside its supported positive range`);
  }
  return Number(value);
}

function verifiedTls(host, certificatePath, label) {
  const ssl = { rejectUnauthorized: true, servername: host };
  if (!certificatePath) return ssl;
  try {
    const ca = fs.readFileSync(path.resolve(__dirname, '..', certificatePath), 'utf8');
    if (!ca.includes('-----BEGIN CERTIFICATE-----')) throw new Error();
    tls.createSecureContext({ ca });
    ssl.ca = [...tls.rootCertificates, ca];
  } catch { throw configurationError(`${label} must point to a readable PEM CA certificate`); }
  return ssl;
}

function getDatabaseConfig(environment = process.env.NODE_ENV === 'test' ? 'test' : 'application', purpose = 'runtime', env = process.env) {
  if (environment === 'test') assertTestTarget(env);
  const target = resolveTarget(environment, purpose, env);
  const prefix = environment === 'test' ? 'TEST_' : '';
  const caKey = `${prefix}DATABASE_CA_CERT`;
  const ssl = verifiedTls(target.host, env[caKey], caKey);
  const statementTimeout = integerSetting(env[`${prefix}DATABASE_STATEMENT_TIMEOUT_MS`], 30000, `${prefix}DATABASE_STATEMENT_TIMEOUT_MS`, 120000);
  const options = {
    connectionString: target.connectionString,
    ssl,
    // No session state is lost: only Direct/Session endpoints are accepted.
    options: '-c search_path=public,extensions',
    application_name: environment === 'test' ? 'roomify-test' : 'roomify',
    max: integerSetting(env[`${prefix}DATABASE_POOL_MAX`], 3, `${prefix}DATABASE_POOL_MAX`, 10),
    connectionTimeoutMillis: integerSetting(env[`${prefix}DATABASE_CONNECT_TIMEOUT_MS`], 10000, `${prefix}DATABASE_CONNECT_TIMEOUT_MS`, 60000),
    idleTimeoutMillis: 30000,
    statement_timeout: statementTimeout,
    query_timeout: statementTimeout + 5000,
  };
  return { target, options };
}

module.exports = { identifyConnection, assertTestTarget, getDatabaseConfig, configurationError };
