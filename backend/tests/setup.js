const { pool } = require('../src/db');
const { assertTestTarget } = require('../src/databaseConfig');

function guardFixtures() {
  // Pure configuration unit tests intentionally use invalid synthetic settings.
  // Real integration fixtures (including cleanup hooks) must always pass the guard.
  if (/(?:\.integration|[\\/]db)\.test\.js$/.test(expect.getState().testPath)) assertTestTarget();
}
beforeEach(guardFixtures);
afterEach(guardFixtures);

// Close the DB pool after each test file so Jest can exit cleanly.
afterAll(async () => {
  await pool.end();
});
