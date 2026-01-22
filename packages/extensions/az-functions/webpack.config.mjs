import CopyWebpackPlugin from 'copy-webpack-plugin';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import webpackNodeExternals from 'webpack-node-externals';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const externals = [
    {
      '@azure/functions-core': '@azure/functions-core',
      '@asteasolutions/zod-to-openapi': '@asteasolutions/zod-to-openapi',
      '@azure/functions': '@azure/functions',
      'inversify': 'inversify',
      'reflect-metadata': 'reflect-metadata',
      'zod': 'zod',
    },
  ];
  if (argv.mode !== 'production') {
    externals.push(
      webpackNodeExternals({
        additionalModuleDirs: ['./node_modules', '../../node_modules', '../../../node_modules'],
      }),
    );
  }

  return {
    extends: path.resolve(__dirname, '../../../webpack.base.config.mjs'),
    entry: {
      functions: './src/index.ts',
    },
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
    ignoreWarnings: [
      /Failed to parse source map/,
      {
        module: /@opentelemetry\/instrumentation/,
      },
      {
        module: /require-in-the-middle/,
      },
    ],
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(require.resolve('swagger-ui-dist'), '..'),
            to: 'assets/swagger-ui',
          },
        ],
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
    },
  };
};
