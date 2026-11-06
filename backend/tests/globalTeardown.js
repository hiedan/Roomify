const { releaseTestLease, safeMessage } = require('../scripts/database');

module.exports = async () => {
  const lease = global.__ROOMIFY_TEST_LEASE;
  delete global.__ROOMIFY_TEST_LEASE;
  try { await releaseTestLease(lease); }
  catch (error) { throw new Error(safeMessage(error)); }
};
