module.exports = {
  extends: ['oclif', 'oclif-typescript', '@vertexvis/vertexvis-typescript'],
  plugins: ['promise', 'simple-import-sort'],
  rules: {
    '@typescript-eslint/no-floating-promises': 'warn',
    'array-callback-return': 'warn',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-await-in-loop': 'warn',
    'no-promise-executor-return': 'warn',
    'no-return-await': 'warn',
    'require-await': 'warn',
    'simple-import-sort/imports': 'warn',
  },
};
