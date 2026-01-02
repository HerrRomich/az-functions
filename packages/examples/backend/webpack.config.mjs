import CopyPlugin from 'copy-webpack-plugin';
import childProcess from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpackNodeExternals from 'webpack-node-externals';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenApiDefinitionPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('OpenApiDefinitionPlugin', compilation => {
      try {
        childProcess.execSync('PLATFORM_MODE=print-open-api node dist/index.cjs');
      } catch (e) {
        compilation.errors.push(new Error('Error generationg OpenAPI definition', { cause: e }));
      }
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
    extends: path.resolve(__dirname, '../../../webpack.config.base.mjs'),
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
      new OpenApiDefinitionPlugin(),
    ],
    output: {
      filename: 'index.cjs',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
    },
  };
};
