import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import 'reflect-metadata';
import { z } from 'zod';

extendZodWithOpenApi(z);

// Increase timeout to 30 seconds to allow the Azure functions to spin up.
jest.setTimeout(30 * 1000);
