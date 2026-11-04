require('dotenv').config();

// Run backend commands from backend/ so dotenv reads backend/.env.
// Application/migration commands use DATABASE_URL (nhatro by default).
// Jest sets NODE_ENV=test; only TEST_DATABASE_URL is then used by src/db.js.
// tests/globalSetup.js also forwards this selected URL to node-pg-migrate.
// Keep the test database separate: tests/helpers.js truncates application data.
const isTest = process.env.NODE_ENV === 'test';

const devUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nhatro';
const testUrl =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nhatro_test';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: isTest ? testUrl : devUrl,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '7d',
};
