require('../src/config');
const { assertTestTarget } = require('../src/databaseConfig');
const { migrate, acquireTestLease, releaseTestLease, safeMessage } = require('../scripts/database');

module.exports = async () => {
  assertTestTarget();
  let lease;
  try {
    lease = await acquireTestLease();
    await migrate('test', lease);
    global.__ROOMIFY_TEST_LEASE = lease;
  } catch (error) {
    if (lease) {
      try { await releaseTestLease(lease); } catch { /* Preserve the original safe failure. */ }
    }
    throw new Error(safeMessage(error));
  }
};
