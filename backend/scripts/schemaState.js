const { configurationError } = require('../src/databaseConfig');
const { canonicalCheck, UnsupportedCheck } = require('./checkExpression');

// Read the existing migrations themselves; do not maintain a second schema/DDL.
function migrationContracts(files) {
  return files.map(file => {
    const contract = { name: file.name, tables: {}, constraints: [], indexes: [] };
    const builder = new Proxy({}, {
      get: (_object, operation) => {
        if (operation === 'func') return sql => ({ sql });
        return (...args) => {
          if (operation === 'createTable') contract.tables[args[0]] = args[1];
          if (operation === 'addConstraint') contract.constraints.push({ table: args[0], name: args[1], options: args[2] });
          if (operation === 'createIndex') contract.indexes.push({ table: args[0], columns: [args[1]].flat(), options: args[2] || {} });
        };
      },
    });
    // Current checked-in migrations build SQL synchronously via pgm; no DB is touched.
    const result = require(file.path).up(builder);
    if (result && typeof result.then === 'function') throw configurationError('Migration contract inspection requires a synchronous migration builder');
    return contract;
  });
}

async function readSchemaState(client) {
  const tables = await client.query("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'");
  const columns = await client.query(`SELECT table_name, column_name, udt_name, is_nullable, column_default,
    character_maximum_length FROM information_schema.columns WHERE table_schema = 'public'`);
  const constraints = await client.query(`SELECT c.relname AS table_name, x.conname AS name, x.contype AS type,
    x.convalidated AS validated,
    pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x
    JOIN pg_class c ON c.oid = x.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'`);
  const indexes = await client.query(`SELECT t.relname AS table_name, i.relname AS name, pg_get_indexdef(i.oid) AS definition,
    x.indisvalid AS valid FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public'`);
  const extensions = await client.query(`SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'postgis'`);
  const hasHistory = tables.rows.some(row => row.name === 'pgmigrations');
  const history = hasHistory ? (await client.query('SELECT name FROM public.pgmigrations ORDER BY id')).rows.map(row => row.name) : [];
  return { tables: tables.rows.map(row => row.name), columns: columns.rows, constraints: constraints.rows,
    indexes: indexes.rows, extensions: extensions.rows, history, hasHistory };
}

const types = { bigserial: 'int8', bigint: 'int8', serial: 'int4', integer: 'int4', real: 'float4',
  'double precision': 'float8', boolean: 'bool', timestamptz: 'timestamptz', text: 'text' };

function assertColumnDefinitions(state, table, definitions) {
  for (const [column, definition] of Object.entries(definitions)) {
    const actual = state.columns.find(row => row.table_name === table && row.column_name === column);
    const expectedType = definition.type.startsWith('varchar') ? 'varchar'
      : definition.type.startsWith('geography') ? 'geography' : types[definition.type];
    const length = /^varchar\((\d+)\)$/.exec(definition.type);
    if (!actual || actual.udt_name !== expectedType ||
        (definition.notNull && actual.is_nullable !== 'NO') ||
        (length && actual.character_maximum_length !== Number(length[1])) ||
        (definition.type.endsWith('serial') && !actual.column_default?.includes('nextval('))) {
      throw configurationError('Applied migration columns differ from the repository contract; inspect the database before migrating');
    }
    if (definition.default !== undefined) {
      const expected = typeof definition.default === 'object' ? definition.default.sql
        : typeof definition.default === 'string' ? `'${definition.default.replaceAll("'", "''")}'` : String(definition.default);
      if (!actual.column_default || !actual.column_default.toLowerCase().includes(expected.toLowerCase())) {
        throw configurationError('An expected application column default differs from its migration');
      }
    }
    if (definition.primaryKey && !state.constraints.some(row => row.table_name === table && row.type === 'p' && row.definition.includes(column))) {
      throw configurationError('An expected application primary key is missing');
    }
    if (definition.unique && !state.constraints.some(row => row.table_name === table && row.type === 'u' && row.definition.includes(column))) {
      throw configurationError('An expected application unique constraint is missing');
    }
    if (definition.references) {
      const reference = typeof definition.references === 'string' ? definition.references : definition.references.name;
      if (!state.constraints.some(row => row.table_name === table && row.type === 'f' &&
        row.definition.includes(`(${column})`) && row.definition.includes(`REFERENCES ${reference}`) &&
        (!definition.onDelete || row.definition.includes(`ON DELETE ${definition.onDelete}`)))) {
        throw configurationError('An expected application foreign key or delete rule is missing');
      }
    }
  }
}

function assertNamedConstraints(state, constraints, tableDefinitions) {
  for (const constraint of constraints) {
    const label = `public.${constraint.table}.${constraint.name}`;
    const actual = state.constraints.find(row => row.table_name === constraint.table && row.name === constraint.name);
    if (!actual) {
      throw configurationError(`Application constraint ${label} is missing`);
    }
    if (actual.validated !== true) throw configurationError(`Application constraint ${label} is not validated`);
    if (constraint.options.check) {
      let matches = false;
      try {
        const columns = tableDefinitions[constraint.table] || {};
        matches = actual.type === 'c' && canonicalCheck(actual.definition, columns, constraint.table) ===
          canonicalCheck(constraint.options.check, columns, constraint.table);
      } catch (error) {
        if (!(error instanceof UnsupportedCheck)) throw error;
        throw configurationError(`Application CHECK ${label} uses an unsupported expression; manual schema review is required`);
      }
      if (!matches) throw configurationError(`Application CHECK ${label} differs from its migration`);
    }
    if (constraint.options.primaryKey && (actual.type !== 'p' || !constraint.options.primaryKey.every(column => actual.definition.includes(column)))) {
      throw configurationError(`Application primary key ${label} differs from its migration`);
    }
  }
}

function assertSchemaHistory(state, contracts) {
  const tableDefinitions = Object.assign({}, ...contracts.map(contract => contract.tables));
  const expectedNames = contracts.map(contract => contract.name);
  if (state.history.some((name, index) => name !== expectedNames[index])) {
    throw configurationError('public.pgmigrations differs from the checked-in migration sequence; compare schema/history manually');
  }
  for (const [index, contract] of contracts.entries()) {
    const applied = index < state.history.length;
    for (const [table, definitions] of Object.entries(contract.tables)) {
      const exists = state.tables.includes(table);
      if (exists !== applied) throw configurationError('Application tables and public.pgmigrations disagree; no migration history was fabricated');
      if (!applied) continue;
      assertColumnDefinitions(state, table, definitions);
    }
    if (!applied) continue;
    assertNamedConstraints(state, contract.constraints, tableDefinitions);
    for (const index of contract.indexes) {
      if (!state.indexes.some(row => row.table_name === index.table && row.valid &&
        index.columns.every(column => row.definition.includes(column)) &&
        (!index.options.name || row.name === index.options.name) &&
        (!index.options.unique || row.definition.includes('UNIQUE INDEX')) &&
        (!index.options.method || row.definition.includes(`USING ${index.options.method}`)) &&
        (!index.options.where || row.definition.includes('WHERE')))) {
        throw configurationError('An expected application index is missing or invalid');
      }
    }
  }
  if (state.history.length && state.extensions.length !== 1) throw configurationError('Applied schema requires a PostGIS extension');
  if (state.extensions.some(extension => !['public', 'extensions'].includes(extension.schema))) {
    throw configurationError('PostGIS must be available in public or extensions; no extension was moved');
  }
}

module.exports = { migrationContracts, readSchemaState, assertSchemaHistory };
