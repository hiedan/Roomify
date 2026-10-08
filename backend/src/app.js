const express = require('express');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/response');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => sendSuccess(res, { status: 'ok' }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
