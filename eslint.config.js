const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'server_dist/*', 'static-build/*'],
  },
  {
    // Node.js scripts and the API server.
    files: ['scripts/**/*.{js,cjs}', 'server/**/*.ts', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]);
