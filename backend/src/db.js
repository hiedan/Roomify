const { Pool } = require('pg');
require('./config');
const { getDatabaseConfig, assertTestTarget } = require('./databaseConfig');

const connection = getDatabaseConfig();
const pool = new Pool(connection.options);
// pg emits idle errors outside query promises. Never log connection credentials.
pool.on('error', () => {
  // eslint-disable-next-line no-console
  console.error('Database idle connection failed');
});

/** Run a parameterized SQL query. Always pass user input through `params`, never string-concat. */
const query = (text, params) => {
  if (connection.target.environment === 'test') assertTestTarget(process.env, connection.target);
  return pool.query(text, params);
};

module.exports = { pool, query };
