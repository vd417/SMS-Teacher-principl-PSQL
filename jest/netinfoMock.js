// Global NetInfo mock for jest (see jest.config.js moduleNameMapper). Uses the
// mock shipped by the package: addEventListener is a no-op, fetch resolves to a
// default "connected" state. Individual tests can override via jest.spyOn.
module.exports = require('@react-native-community/netinfo/jest/netinfo-mock.js');
