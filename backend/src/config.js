require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'roomify-dev-secret-key-32-bytes-long-123456',
  jwtExpiresIn: '7d',
};
