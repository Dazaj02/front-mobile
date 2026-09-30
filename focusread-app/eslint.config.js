const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

// Reglas de dependencia atómica (PLAN_FRONTEND §5.2). En "warn" hasta F3.
const DEP_LEVEL = 'warn';

const forbid = (...groups) => ({
  'no-restricted-imports': [
    DEP_LEVEL,
    { patterns: groups.map((g) => ({ group: g, message: 'Viola la regla de dependencia atómica (§5.2)' })) },
  ],
});

const outer = ['**/data/**', '**/services/**', '**/state/**', '**/features/**', '**/navigation/**'];

module.exports = defineConfig([
  expo,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*'] },
  {
    files: ['src/design-system/tokens/**'],
    rules: forbid('**/atoms/**', '**/molecules/**', '**/organisms/**', '**/templates/**', '**/theme/**', '**/layout/**', '**/lib/**', ...outer),
  },
  {
    files: ['src/design-system/atoms/**'],
    rules: forbid('**/molecules/**', '**/organisms/**', '**/templates/**', ...outer),
  },
  {
    files: ['src/design-system/molecules/**'],
    rules: forbid('**/organisms/**', '**/templates/**', ...outer),
  },
  {
    files: ['src/design-system/organisms/**'],
    rules: forbid('**/templates/**', ...outer),
  },
  {
    files: ['src/design-system/templates/**'],
    rules: forbid(...outer),
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        DEP_LEVEL,
        {
          patterns: [
            { group: ['react', 'react-native', 'react-native/**', 'expo', 'expo-*', '@expo/**'], message: 'domain no puede depender de React/RN/Expo (§5.2)' },
          ],
        },
      ],
    },
  },
]);
