export default {
  plugins: ['prettier-plugin-organize-imports'],
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',

  endOfLine: 'auto',
  useTabs: false,
  printWidth: 120,
  tabWidth: 2,
  jsxSingleQuote: true,
  quoteProps: 'consistent',

  overrides: [
    {
      files: ['*.json', '*.yaml'],
      options: {
        singleQuote: false,
      },
    },
  ],
};
