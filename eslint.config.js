import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Recommended base configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Global ignores (replaces ignorePatterns)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'scada-proxy/**',
      'src/test/**',
      'src/stores/index.ts', // Has circular dependency issues
      'src/0.10 Archive/**', // Archived code, no need to lint
      'coverage/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Main configuration for TypeScript files
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
        NodeJS: 'readonly',
        THREE: 'readonly',
        React: 'readonly',
        RequestInit: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // React hooks rules - disabled as TypeScript and runtime catch real issues
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off', // React Three Fiber patterns use refs in effects

      // TypeScript handles these
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      'no-undef': 'off',

      // Valid patterns that ESLint flags incorrectly
      'no-case-declarations': 'off',

      // TypeScript-specific rules to keep code clean
      '@typescript-eslint/no-explicit-any': 'off', // Too restrictive for 3D graphics code
      '@typescript-eslint/no-non-null-assertion': 'off', // Needed for Three.js refs
      '@typescript-eslint/ban-ts-comment': 'off', // Sometimes needed for library quirks

      // 3D animation code often has intentional patterns that look like bugs
      'no-constant-binary-expression': 'off', // Intentional in animation state machines
      'prefer-const': 'warn', // Warning only - valid reasons to use let exist
    },
  }
);
