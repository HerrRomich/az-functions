import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: 'node',
  devtool: false,
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
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      noSources: true,
      fileContext: 'test',
      moduleFilenameTemplate: context => {
        return path.relative(__dirname, context.absoluteResourcePath).replaceAll('\\', '/');
      },
    }),
  ],
  resolve: {
    mainFields: ['main'],
    fallback: {
      'bufferutil': false,
      'utf-8-validate': false,
    },
    alias: {
      zod: require.resolve('zod'),
    },
    extensions: ['.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  ignoreWarnings: [/Failed to parse source map/],
};
