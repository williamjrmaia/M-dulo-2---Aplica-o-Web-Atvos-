const tseslint = require('typescript-eslint');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = tseslint.config({
  files: ['src/**/*.ts'],
  plugins: { sonarjs },
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {},
});
