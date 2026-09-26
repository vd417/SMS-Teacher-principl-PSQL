const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    // The @typescript-eslint plugin is registered by eslint-config-expo only
    // for TS files, so scope its rules there to avoid "plugin not found" on JS.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // CommonJS jest configs (see metro.config.js's own such override in eslint-config-expo/flat).
    files: ['jest.e2e.config.js', 'jest.capture.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', module: 'readonly', require: 'readonly' },
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**'],
  },
];
