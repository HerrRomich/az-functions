import CopyPlugin from 'copy-webpack-plugin';
import childProcess from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import webpackNodeExternals from 'webpack-node-externals';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenApiDefinitionPlugin {
  apply(compiler) {
    const logger = compiler.getInfrastructureLogger('OpenApiDefinitionPlugin');

    compiler.hooks.afterEmit.tapPromise('OpenApiDefinitionPlugin', async compilation => {
      await new Promise(resolve => {
        const child = childProcess.spawn('node', ['dist/index.cjs'], {
          env: { ...process.env, PLATFORM_MODE: 'print-open-api' },
        });

        child.stdout.on('data', data => {
          const message = data.toString();
          logger.info(message);
        });

        child.stderr.on('data', data => {
          const message = data.toString();
          logger.error(message);
        });

        child.on('close', code => {
          if (code !== 0) {
            compilation.errors.push(new Error(`OpenAPI definition generation process exited with code ${code}`));
          }
          resolve();
        });
      });
    });
  }
}

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
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(require.resolve('swagger-ui-dist'), '..'),
            to: 'assets/swagger-ui',
          },
        ],
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$/,
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      new OpenApiDefinitionPlugin(),
    ],
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
    },
  };
};
