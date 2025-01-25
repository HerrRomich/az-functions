import CopyWebpackPlugin from 'copy-webpack-plugin';
import { createRequire } from 'module';
import * as path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import webpackNodeExternals from 'webpack-node-externals';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  const externals = [
    {
      '@azure/functions-core': '@azure/functions-core',
    },
    webpackNodeExternals({
      additionalModuleDirs: ['./node_modules'],
    }),
  ];

  return {
    entry: {
      functions: './src/index.ts',
    },
    externalsPresets: { node: true },
    externals,
    target: 'node',
    devtool: false,
    optimization: {
      moduleIds: 'named',
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true,
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.cjs$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        },
      ],
    },
    ignoreWarnings: [/Failed to parse source map/],
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        noSources: true,
        fileContext: 'test',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(require.resolve('swagger-ui-dist'), '..'),
            to: 'assets/swagger-ui',
          },
        ],
      }),
    ],
    resolve: {
      extensions: ['.ts', '.js'],
      plugins: [new TsconfigPathsPlugin()],
    },
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
    },
  };
};
