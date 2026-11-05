const express = require('express');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/response');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const listingRoutes = require('./routes/listingRoutes');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => sendSuccess(res, { status: 'ok' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/listings', listingRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
