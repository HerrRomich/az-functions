import * as sourceMapSupport from '@forks/source-map-support';
import 'reflect-metadata';

sourceMapSupport.install({
  environment: 'node',
  overrideRetrieveFile: false,
});
