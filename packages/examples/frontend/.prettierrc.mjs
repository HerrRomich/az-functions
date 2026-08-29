import config from '../../../.prettierrc.mjs';

export default {
  ...config,
  overrides: [
    {
      files: ['*.json', '*.yaml'],
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.html',
      options: {
        parser: 'angular',
      },
    },
  ],
};
