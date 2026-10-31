const path = require('path');
const { execSync } = require('child_process');

// Runs once before all tests: apply migrations to the TEST database.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const config = require('../src/config');
  execSync('npx node-pg-migrate -m migrations up', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: config.databaseUrl },
  });
};
