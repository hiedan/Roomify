require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const devUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nhatro';
const testUrl =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nhatro_test';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: isTest ? testUrl : devUrl,
  jwtSecret: process.env.JWT_SECRET || 'roomify-dev-secret-key-32-bytes-long-123456',
  jwtExpiresIn: '7d',
};
