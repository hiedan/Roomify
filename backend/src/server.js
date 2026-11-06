const config = require('./config');

async function start() {
  const { pool } = require('./db');
  try {
    const { createApp } = require('./app');
    await pool.query('SELECT 1');
    const server = createApp().listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Roomify API listening on http://localhost:${config.port}`);
    });
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      const deadline = setTimeout(() => server.closeAllConnections(), 10000);
      deadline.unref();
      server.close(() => {
        clearTimeout(deadline);
        pool.end().catch(() => { process.exitCode = 1; });
      });
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    server.on('error', error => {
      const message = error.code === 'EADDRINUSE'
        ? `Port ${config.port} is already in use. Stop the existing backend before running npm run dev again.`
        : error.code === 'EACCES'
          ? `Permission denied when listening on port ${config.port}.`
          : 'HTTP server failed to start';
      // eslint-disable-next-line no-console
      console.error(message);
      process.exitCode = 1;
      pool.end().catch(() => {});
    });
    return { server, stop };
  } catch (error) { await pool.end().catch(() => {}); throw error; }
}

if (require.main === module) {
  start().catch(error => {
    // Never emit a raw pg/TLS/network error or a connection string.
    // eslint-disable-next-line no-console
    console.error(error.code === 'DATABASE_CONFIG_ERROR' ? error.message : 'Database connection failed; check the configured Supabase endpoint and CA');
    process.exitCode = 1;
  });
}

module.exports = { start };
