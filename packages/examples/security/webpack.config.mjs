import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import webpackNodeExternals from 'webpack-node-externals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const externals = [
    {
      '@azure/functions-core': '@azure/functions-core',
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
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      library: {
        type: 'commonjs',
      },
    },
  };
};
