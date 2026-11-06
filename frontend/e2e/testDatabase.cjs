const { randomUUID } = require('crypto');
process.env.NODE_ENV = 'test';
const config = require('../../backend/src/config');
const { assertTestTarget } = require('../../backend/src/databaseConfig');
assertTestTarget();
const { query, pool } = require('../../backend/src/db');
const auth = require('../../backend/src/services/authService');
const ids = [];
const PASSWORD = 'BrowserSyntheticFixture!123';
let passwordHash;
async function account() {
  assertTestTarget();
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
  assertTestTarget();
  if (!ids.length) return;
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    // Real admin UI actions create restricted audit references to these fixtures.
    // Delete only records owned by this worker's generated test-account IDs.
    await client.query('DELETE FROM admin_action_audits WHERE actor_user_id = ANY($1::bigint[]) OR target_user_id = ANY($1::bigint[])', [ids]);
    await client.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw error;
  } finally { client.release(releaseError); }
  ids.length = 0;
}
module.exports = { account, cleanup, query, pool, config };
