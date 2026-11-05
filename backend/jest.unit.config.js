// Keep unit tests independent of the integration suite's DB migrations and pool setup.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/authService.test.js'],
  clearMocks: true,
  restoreMocks: true,
};
