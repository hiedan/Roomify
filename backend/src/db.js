const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ connectionString: config.databaseUrl });

/** Run a parameterized SQL query. Always pass user input through `params`, never string-concat. */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
