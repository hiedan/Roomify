// Keep unit tests independent of the integration suite's DB migrations and pool setup.
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/authService.test.js',
    '<rootDir>/tests/authMiddleware.test.js',
    '<rootDir>/tests/authRole.test.js',
    '<rootDir>/tests/authOwnership.test.js',
    '<rootDir>/tests/authAccountService.test.js',
    '<rootDir>/tests/authController.test.js',
    '<rootDir>/tests/adminService.test.js',
    '<rootDir>/tests/adminController.test.js',
    '<rootDir>/tests/errorHandler.test.js',
    '<rootDir>/tests/globalSetup.test.js',
    '<rootDir>/tests/listingService.test.js',
  ],
  clearMocks: true,
  restoreMocks: true,
};
