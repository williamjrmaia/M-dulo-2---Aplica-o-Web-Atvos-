const tseslint = require('typescript-eslint');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = tseslint.config({
  files: ['**/*.ts'],
  ignores: ['test/**', 'tests/**'],
  plugins: { sonarjs },
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {
    // Habilita o conjunto recomendado do SonarJS para detecção de bugs e code smells.
    ...sonarjs.configs.recommended.rules,
  },
});
