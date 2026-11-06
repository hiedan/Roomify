const path = require('node:path');
const fs = require('node:fs');
const { migrationContracts, assertSchemaHistory, readSchemaState } = require('../scripts/schemaState');

const contracts = [{ name: '001_initial', tables: {
  users: { id: { type: 'bigserial', primaryKey: true }, role: { type: 'varchar(20)', notNull: true, default: 'tenant' } },
}, constraints: [{ table: 'users', name: 'users_role_check', options: { check: "role IN ('tenant','landlord','admin')" } }],
indexes: [{ table: 'users', columns: ['role'], options: {} }] }];
function appliedState() {
  return { tables: ['users', 'pgmigrations'], hasHistory: true, history: ['001_initial'],
    extensions: [{ name: 'postgis', schema: 'extensions' }],
    columns: [{ table_name: 'users', column_name: 'id', udt_name: 'int8', column_default: "nextval('users_id_seq')" },
      { table_name: 'users', column_name: 'role', udt_name: 'varchar', is_nullable: 'NO', character_maximum_length: 20, column_default: "'tenant'::character varying" }],
    constraints: [{ table_name: 'users', name: 'users_pkey', type: 'p', validated: true, definition: 'PRIMARY KEY (id)' },
      { table_name: 'users', name: 'users_role_check', type: 'c', validated: true, definition: "CHECK (role = ANY (ARRAY['tenant', 'landlord', 'admin']))" }],
    indexes: [{ table_name: 'users', definition: 'CREATE INDEX ON users USING btree (role)', valid: true }],
  };
}

test('migration contract inspection reuses every real migration without running SQL', () => {
  const directory = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.js')).sort()
    .map(file => ({ name: file.slice(0, -3), path: path.join(directory, file) }));
  const actual = migrationContracts(files);
  expect(actual[0].tables.listings.geom.type).toBe('geography(Point,4326)');
  expect(actual[1].tables.admin_action_audits.target_user_id.onDelete).toBe('RESTRICT');
  expect(actual[2].indexes.some(index => index.options.name === 'landlord_requests_one_pending_per_user')).toBe(true);
});

test('an empty database and a valid applied prefix are accepted', () => {
  expect(() => assertSchemaHistory({ tables: [], history: [], columns: [], constraints: [], indexes: [], extensions: [] }, contracts)).not.toThrow();
  expect(() => assertSchemaHistory(appliedState(), contracts)).not.toThrow();
});

test.each([
  state => { state.history = []; }, state => { state.tables = ['pgmigrations']; },
  state => { state.history = ['untracked_migration']; }, state => { state.columns[0].udt_name = 'int4'; },
  state => { state.columns[1].column_default = "'landlord'"; }, state => { state.columns[1].character_maximum_length = 50; },
  state => { state.indexes = []; }, state => { state.indexes[0].valid = false; },
  state => { state.constraints[1].definition = "CHECK (role IN ('tenant', 'admin'))"; },
  state => { state.extensions[0].schema = 'roomify_test'; }, state => { state.extensions = []; },
])('schema/history drift is refused instead of inventing migration history', mutate => {
  const state = appliedState();
  mutate(state);
  expect(() => assertSchemaHistory(state, contracts)).toThrow();
});

test('read-only inspection does not assume a migration table exists', async () => {
  const client = { query: jest.fn(async () => ({ rows: [] })) };
  const result = await readSchemaState(client);
  expect(result.history).toEqual([]);
  expect(result.hasHistory).toBe(false);
  expect(client.query.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
});

const migrationDirectory = path.resolve(__dirname, '../migrations');
const realContracts = migrationContracts(fs.readdirSync(migrationDirectory).filter(file => file.endsWith('.js')).sort()
  .map(file => ({ name: file.slice(0, -3), path: path.join(migrationDirectory, file) })));
const checkColumns = {
  users: { role: 'varchar(20)' },
  listings: { lat: 'double precision', lng: 'double precision', price: 'integer', area_m2: 'real', status: 'varchar(20)' },
  admin_action_audits: { action_type: 'varchar(30)', previous_value: 'varchar(20)', new_value: 'varchar(20)', actor_user_id: 'bigint', target_user_id: 'bigint' },
  landlord_requests: { status: 'varchar(20)', reviewed_at: 'timestamptz', rejection_reason: 'varchar(500)' },
};

function checkFixture(table, name, definition) {
  const constraint = realContracts.flatMap(contract => contract.constraints).find(check => check.table === table && check.name === name);
  if (!constraint) throw new Error('Invalid regression fixture');
  const definitions = Object.fromEntries(Object.entries(checkColumns[table]).map(([column, type]) => [column, { type }]));
  const columns = Object.entries(checkColumns[table]).map(([column, type]) => ({ table_name: table, column_name: column,
    udt_name: type.startsWith('varchar') ? 'varchar' : ({ 'double precision': 'float8', integer: 'int4', real: 'float4', bigint: 'int8' })[type] || type,
    character_maximum_length: type.startsWith('varchar') ? Number(/\d+/.exec(type)[0]) : null,
  }));
  return {
    state: { tables: [table], history: ['check_fixture'], extensions: [{ schema: 'extensions', name: 'postgis' }],
      columns, indexes: [], constraints: [{ table_name: table, name, type: 'c', validated: true, definition }] },
    contracts: [{ name: 'check_fixture', tables: { [table]: definitions }, constraints: [constraint], indexes: [] }],
  };
}
function expectCheck(table, name, definition, accepted) {
  const fixture = checkFixture(table, name, definition);
  const inspect = () => assertSchemaHistory(fixture.state, fixture.contracts);
  if (accepted) expect(inspect).not.toThrow();
  else expect(inspect).toThrow(`public.${table}.${name}`);
}

test.each([
  ['lat', '-90', '90'], ['lng', '-180', '180'],
])('accepts real PostgreSQL %s bounds with quoted negative literals and numeric cast chains', (column, lower, upper) => {
  expectCheck('listings', `listings_${column}_check`,
    `CHECK (((${column} >= ('${lower}'::integer)::double precision) AND (${column} <= (${upper})::double precision)))`, true);
  expectCheck('listings', `listings_${column}_check`,
    `${column} >= '${lower}'::integer::double precision AND ${column} <= ${upper}::double precision`, true);
  expectCheck('listings', `listings_${column}_check`,
    `CHECK (${upper}::double precision >= ${column} AND ${lower}::double precision <= ${column})`, true);
});

test.each([
  ['lat', "CHECK (lat >= '-91'::integer::double precision AND lat <= 90::double precision)"],
  ['lat', "CHECK (lat >= '-90'::integer::double precision AND lat <= 91::double precision)"],
  ['lng', "CHECK (lng >= '-181'::integer::double precision AND lng <= 180::double precision)"],
  ['lng', "CHECK (lng >= '-180'::integer::double precision AND lng <= 181::double precision)"],
  ['lat', 'CHECK (lat > -90 AND lat <= 90)'], ['lat', 'CHECK (lat >= -90 OR lat <= 90)'],
  ['lat', 'CHECK (lng BETWEEN -90 AND 90)'],
])('detects altered limits, columns, boundary operators or grouping for %s', (column, definition) => {
  expectCheck('listings', `listings_${column}_check`, definition, false);
});

test.each(['CHECK (price > 999)', 'CHECK (price >= 0)', 'CHECK (price < 0)', 'CHECK (price <> 0)', 'CHECK (area_m2 > 0)'])(
  'does not mistake %s for price > 0', definition => expectCheck('listings', 'listings_price_check', definition, false)
);

test('accepts PostgreSQL widening the real area comparison and explicit built-in numeric casts', () => {
  expectCheck('listings', 'listings_area_check', 'CHECK ((area_m2 > (0)::double precision))', true);
  expectCheck('listings', 'listings_lat_check', 'CHECK (lat BETWEEN CAST(-90 AS pg_catalog.float8) AND CAST(90 AS double precision))', true);
});

test.each([
  ['users', 'users_role_check', ['tenant', 'landlord', 'admin']],
  ['listings', 'listings_status_check', ['pending', 'approved', 'rejected']],
  ['landlord_requests', 'landlord_requests_status_check', ['pending', 'approved', 'rejected']],
])('normalizes IN/ANY for %s without losing allowed values or the tested column', (table, name, allowed) => {
  const column = table === 'users' ? 'role' : 'status';
  const any = values => `CHECK ((${column})::text = ANY ((ARRAY[${values.map(value => `'${value}'::character varying`).join(',')}])::text[]))`;
  expectCheck(table, name, any([...allowed].reverse()), true);
  expectCheck(table, name, any(allowed.slice(1)), false);
  expectCheck(table, name, any([...allowed, 'unexpected_access']), false);
  expectCheck(table, name, any(allowed).replace('= ANY', '<> ANY'), false);
  expectCheck(table, name, any(allowed).replace('character varying', 'character varying(1)'), false);
  expectCheck(table, name, any(allowed).replace('])::text[]', ',NULL])::text[]'), false);
});

const pgAudit = `CHECK (
  (action_type::text = 'role_change'::text
    AND previous_value::text = ANY ((ARRAY['tenant'::varchar,'landlord'::varchar])::text[])
    AND new_value::text = ANY ((ARRAY['tenant'::varchar,'landlord'::varchar])::text[])
    AND previous_value::text <> new_value::text)
  OR (action_type::text = 'account_disable'::text AND previous_value::text = 'true'::text AND new_value::text = 'false'::text)
  OR (action_type::text = 'account_enable'::text AND previous_value::text = 'false'::text AND new_value::text = 'true'::text)
)`;

test('accepts the PostgreSQL audit expression, preserving action branches, columns and comparisons', () => {
  expectCheck('admin_action_audits', 'admin_action_audits_values_check', pgAudit, true);
  expectCheck('admin_action_audits', 'admin_action_audits_distinct_users_check', 'CHECK ((actor_user_id <> target_user_id))', true);
});

test.each([
  pgAudit.replace('previous_value::text <> new_value::text', 'previous_value::text = new_value::text'),
  pgAudit.replace("'account_disable'::text AND previous_value::text", "'account_disable'::text OR previous_value::text"),
  pgAudit.replace("'account_disable'::text AND previous_value::text = 'true'::text AND new_value::text = 'false'::text",
    "'account_disable'::text AND previous_value::text = 'false'::text AND new_value::text = 'true'::text"),
  pgAudit.replace("OR (action_type::text = 'account_enable'", "AND (action_type::text = 'account_enable'"),
  `CHECK (action_type = 'role_change' AND (
    (previous_value IN ('tenant','landlord') AND new_value IN ('tenant','landlord') AND previous_value <> new_value)
    OR (action_type = 'account_disable' AND previous_value = 'true' AND new_value = 'false')
    OR (action_type = 'account_enable' AND previous_value = 'false' AND new_value = 'true')))` ,
])('detects changed audit operators, per-column values and AND/OR grouping', definition => {
  expectCheck('admin_action_audits', 'admin_action_audits_values_check', definition, false);
});

test('normalizes the existing landlord-request NULL and trim/length conditions', () => {
  expectCheck('landlord_requests', 'landlord_requests_review_check', `CHECK (
    (status::text = 'pending'::text AND reviewed_at IS NULL AND rejection_reason IS NULL)
    OR (status::text = 'approved'::text AND reviewed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status::text = 'rejected'::text AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL
        AND length(TRIM(BOTH FROM rejection_reason)) > 0))`, true);
  expectCheck('landlord_requests', 'landlord_requests_review_check', `CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'approved' AND reviewed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL
        AND pg_catalog.length(pg_catalog.btrim(rejection_reason::text)) > 0))`, true);
});

test.each([
  'CHECK (lat::integer BETWEEN -90 AND 90)',
  'CHECK (lat BETWEEN -90::numeric(2,0) AND 90)',
  "CHECK (lat >= '-90'::custom_type AND lat <= 90)",
  "CHECK (coalesce(lat, 0) BETWEEN -90 AND 90)",
  "CHECK (CASE WHEN lat IS NULL THEN true ELSE lat BETWEEN -90 AND 90 END)",
  "CHECK (lat BETWEEN -90 AND 90) OR secret_private_marker('credential-like-sentinel')",
])('unsupported or potentially lossy constructs require named manual review without echoing SQL', definition => {
  const fixture = checkFixture('listings', 'listings_lat_check', definition);
  let error;
  try { assertSchemaHistory(fixture.state, fixture.contracts); } catch (caught) { error = caught; }
  expect(error.message).toContain('public.listings.listings_lat_check');
  expect(error.message).toMatch(/unsupported.*manual schema review/);
  expect(error.message).not.toMatch(/credential-like-sentinel|secret_private_marker|custom_type/);
});

test('BIGINT-to-float comparisons are not treated as harmless column casts', () => {
  const fixture = checkFixture('admin_action_audits', 'admin_action_audits_distinct_users_check',
    'CHECK (actor_user_id::double precision <> target_user_id::double precision)');
  expect(() => assertSchemaHistory(fixture.state, fixture.contracts)).toThrow(/unsupported/);
});

test.each(['missing', 'not-validated', 'unknown-validation', 'wrong-type'])('rejects a %s CHECK with its table and constraint name', kind => {
  const fixture = checkFixture('listings', 'listings_price_check', 'CHECK (price > 0)');
  if (kind === 'missing') fixture.state.constraints = [];
  if (kind === 'not-validated') fixture.state.constraints[0].validated = false;
  if (kind === 'unknown-validation') delete fixture.state.constraints[0].validated;
  if (kind === 'wrong-type') fixture.state.constraints[0].type = 'u';
  expect(() => assertSchemaHistory(fixture.state, fixture.contracts)).toThrow('public.listings.listings_price_check');
});

test('catalog inspection reads convalidated and preserves its false value', async () => {
  const client = { query: jest.fn(async sql => ({ rows: sql.includes('FROM pg_constraint')
    ? [{ table_name: 'listings', name: 'listings_price_check', type: 'c', validated: false, definition: 'CHECK (price > 0)' }] : [] })) };
  const state = await readSchemaState(client);
  expect(client.query.mock.calls.find(([sql]) => sql.includes('FROM pg_constraint'))[0]).toContain('x.convalidated AS validated');
  expect(state.constraints[0].validated).toBe(false);
});
