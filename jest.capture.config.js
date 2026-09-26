/** Parity-matrix live capture (Task 6). Same real stack as the e2e gate; writes redacted JSON evidence. */
const base = require('./jest.e2e.config.js');

module.exports = { ...base, testMatch: ['<rootDir>/e2e/capture/**/*.capture.test.ts'] };
