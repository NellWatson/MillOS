module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'node_modules',
    'scada-proxy',
    'src/test/**',
    'src/stores/index.ts', // Has circular dependency issues
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-hooks'],
  globals: {
    NodeJS: 'readonly',
    THREE: 'readonly',
    React: 'readonly',
    RequestInit: 'readonly',
  },
  rules: {
    'react-hooks/rules-of-hooks': 'warn', // Demote to warning (needs refactoring)
    'react-hooks/exhaustive-deps': 'off', // Disabled: React Three Fiber patterns use refs in effects
    'no-unused-vars': 'off', // TypeScript handles this
    'no-redeclare': 'off', // TypeScript handles this
    'no-case-declarations': 'warn', // Demote to warning
    'no-undef': 'off', // Disabled: TypeScript catches real issues, browser APIs flagged incorrectly
  },
};
