module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  verbose: false,
  modulePathIgnorePatterns: ['<rootDir>/deploy-package']
};