const { pool } = require('../src/db');
require('../src/config').jwtSecret = process.env.JWT_SECRET || 'roomify-test-only-secret';

// Close the DB pool after each test file so Jest can exit cleanly.
afterAll(async () => {
  await pool.end();
});
