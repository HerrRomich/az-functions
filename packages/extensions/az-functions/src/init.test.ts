import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

jest.mock('@asteasolutions/zod-to-openapi');

describe('init', () => {
  it('should extend zod with openapi', async () => {
    await import('./init');

    expect(extendZodWithOpenApi).toHaveBeenCalledWith(z);
  });
});
