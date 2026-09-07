import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import * as sourceMapSupport from '@forks/source-map-support';
import 'reflect-metadata';
import z from 'zod';

sourceMapSupport.install({
  environment: 'node',
  overrideRetrieveFile: false,
});

extendZodWithOpenApi(z);
