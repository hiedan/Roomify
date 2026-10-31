const { pool } = require('../src/db');

// Close the DB pool after each test file so Jest can exit cleanly.
afterAll(async () => {
  await pool.end();
});
