import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpackNodeExternals from 'webpack-node-externals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function wp(env, argv) {
  const externals = [
    {
      kysely: 'kysely',
    },
  ];
  if (argv.mode !== 'production') {
    externals.push(
      webpackNodeExternals({
        additionalModuleDirs: ['./node_modules', '../../node_modules'],
      }),
    );
  }

  return {
    extends: path.resolve(__dirname, '../../../webpack.base.config.mjs'),
    entry: './src/index.ts',
    externalsPresets: { node: true },
    externals,
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        },
      ],
    },
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
    },
  };
}
