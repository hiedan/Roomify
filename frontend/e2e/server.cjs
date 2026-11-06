// Isolated E2E backend: validated Supabase test project, coordinated with Jest.
const { pool } = require('./testDatabase.cjs');
const setup = require('../../backend/tests/globalSetup');
const teardown = require('../../backend/tests/globalTeardown');
const { createApp } = require('../../backend/src/app');
setup().then(() => {
  const server = createApp().listen(4310, '127.0.0.1');
  const stop = () => server.close(() => pool.end().then(teardown).then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}).catch(async () => {
  console.error('Isolated browser-test backend setup failed');
  await pool.end();
  await teardown();
  process.exitCode = 1;
});
