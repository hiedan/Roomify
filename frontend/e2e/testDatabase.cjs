const path = require('path');
const { randomUUID } = require('crypto');
require('../../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
process.env.NODE_ENV = 'test';
const config = require('../../backend/src/config');
try {
  if (new URL(config.databaseUrl).pathname !== '/nhatro_test' ||
      new URL(process.env.DATABASE_URL || 'postgres://localhost/nhatro').pathname === '/nhatro_test') {
    throw new Error();
  }
} catch {
  throw new Error('Browser fixtures require valid URLs and nhatro_test separate from development');
}
const { query, pool } = require('../../backend/src/db');
const auth = require('../../backend/src/services/authService');
const ids = [];
const PASSWORD = 'BrowserSyntheticFixture!123';
let passwordHash;
async function account() {
  passwordHash ||= await auth.hashPassword(PASSWORD);
  const email = `browser-${randomUUID()}@gmail.com`;
  const { rows } = await query(
    `INSERT INTO users (full_name,email,password_hash) VALUES ('Browser Synthetic User',$1,$2) RETURNING id`,
    [email, passwordHash]
  );
  ids.push(rows[0].id);
  return { ...rows[0], email, password: PASSWORD };
}
async function cleanup() {
  if (ids.length) await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
  ids.length = 0;
}
module.exports = { account, cleanup, query, pool, config };
