import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: [
      '.vite/**',
      'dist/**',
      'src/renderer/dist/**',
      'node_modules/**',
      'tasky-mcp-agent/**',
      'vitest.config.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    files: [
      'src/electron/**/*.ts',
      'src/main.ts',
      'src/preload.ts',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
