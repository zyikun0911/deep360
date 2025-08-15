module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js', '**/tests/**/?(*.)+(spec|test).js'],
  transform: {},
  testTimeout: 30000,
  verbose: false
};