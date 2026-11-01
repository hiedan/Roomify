const path = require('path');
const { runner } = require('node-pg-migrate');

// Runs once before all tests: apply migrations to the TEST database.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const config = require('../src/config');
  if (!new URL(config.databaseUrl).pathname.endsWith('_test')) {
    throw new Error('Tests must use a dedicated database ending in _test');
  }
  await runner({ databaseUrl: config.databaseUrl, dir: path.join(__dirname, '../migrations'), direction: 'up', migrationsTable: 'pgmigrations' });
};
