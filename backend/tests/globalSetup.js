const path = require('path');
const { execSync } = require('child_process');

// Runs once before all tests: apply migrations to the TEST database.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const config = require('../src/config');
  let testUrl;
  let developmentUrl;
  try {
    testUrl = new URL(config.databaseUrl);
    developmentUrl = new URL(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nhatro');
  } catch {
    // Never print a malformed connection string: it may contain credentials.
    throw new Error('Integration tests require valid development/test database URLs');
  }
  if (testUrl.pathname !== '/nhatro_test' || developmentUrl.pathname === testUrl.pathname) {
    throw new Error('Integration tests require nhatro_test separate from the development database');
  }
  execSync('npx node-pg-migrate -m migrations up', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: config.databaseUrl },
  });
};
