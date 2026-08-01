import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import localRules from './eslint-local-rules/no-bare-outline-none.js';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      'scripts/**',
      'eslint-local-rules/**',
      'public/**/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      react,
      'jsx-a11y': jsxA11y,
      local: localRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Keep interactive-element rules at error (recommended may omit some of these).
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      // WS-E: never strip focus outline without a visible ring companion.
      'local/no-bare-outline-none': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'error',
      'react/display-name': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
    settings: { react: { version: 'detect' } },
  },
  eslintConfigPrettier,
);
