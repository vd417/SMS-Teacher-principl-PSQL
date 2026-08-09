// Jest stub for the native Sentry SDK. The real package ships untranspiled ESM
// that jest-expo does not transform; tests never exercise real Sentry, so we map
// the import to these no-ops via moduleNameMapper in jest.config.js.
module.exports = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  addBreadcrumb: () => {},
  wrap: (c) => c,
};
