// Isolated E2E backend: fixed test target and no development reset/seed.
const { pool } = require('./testDatabase.cjs');
const setup = require('../../backend/tests/globalSetup');
const { createApp } = require('../../backend/src/app');
setup().then(() => {
  const server = createApp().listen(4310, '127.0.0.1');
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}).catch(() => {
  console.error('Isolated browser-test backend setup failed');
  process.exit(1);
});
