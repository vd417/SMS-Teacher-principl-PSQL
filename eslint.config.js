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
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**'],
  },
];
