module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'arrow-body-style': 'off',
    'consistent-return': 'off',
    'global-require': 'off',
    'linebreak-style': ['off', 'windows'],
    "no-bitwise": "off",
    'no-continue': 'off',
    'no-param-reassign': ['error', { props: false }],
    "operator-assignment": "off",
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    "import/no-dynamic-require": "off"
  },
};
