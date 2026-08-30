import { getPartialFixture } from 'test-utilities';
import { z, ZodObject } from 'zod';
import { DirectResponseObject } from './decorators/index';
import { InternalServerError } from './http-controller.model';
import { HttpResponseProcessorFactory } from './http-response-processor.factory';

describe('HttpResponseProcessorFactory', () => {
  let subject: HttpResponseProcessorFactory;

  beforeEach(() => {
    subject = new HttpResponseProcessorFactory();
  });

  describe('provideStatusProcessor', () => {
    it('should set direct response status to 200 when no direct response is provided', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({});
      const statusProcessor = subject.provideStatusProcessor(testResponse)!;

      const output = await statusProcessor({});

      expect(output.status).toEqual(200);
    });

    it('should set direct response status when no response status is provided', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        status: 204,
      });
      const statusProcessor = subject.provideStatusProcessor(testResponse)!;

      const output = await statusProcessor({});

      expect(output.status).toEqual(204);
    });

    it('should add a status processor to the stack', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        status: 201,
      });
      const statusProcessor = subject.provideStatusProcessor(testResponse)!;

      const output = await statusProcessor({
        status: 201,
      });

      expect(output.status).toEqual(201);
    });

    it('should fail when the status does not match the direct response', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        status: 201,
      });
      const statusProcessor = subject.provideStatusProcessor(testResponse)!;

      await expect(
        statusProcessor({
          status: 200,
        }),
      ).rejects.toThrowWithMessage(
        InternalServerError,
        'Response status code 200 does not match direct response status code 201.',
      );
    });
  });

  describe('provideJsonBodyProcessor', () => {
    it('should return undefined when no direct response json content is provided', () => {
      const testResponse = getPartialFixture<DirectResponseObject>({});
      const jsonBodyProcessor = subject.provideJsonBodyProcessor(testResponse);

      expect(jsonBodyProcessor).toBeUndefined();
    });

    it('should add a json body processor to the stack', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        jsonContent: {
          schema: z.object({
            testProperty: z.string(),
          }),
        },
      });
      const jsonBodyProcessor = subject.provideJsonBodyProcessor(testResponse)!;

      const output = await jsonBodyProcessor({
        jsonBody: {
          testProperty: 'test-value',
        },
      });

      expect(output.jsonBody).toEqual({
        testProperty: 'test-value',
      });
    });

    it('should fail when the json body does not match the schema', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        jsonContent: {
          schema: z.object({
            testProperty: z.string(),
          }),
        },
      });
      const jsonBodyProcessor = subject.provideJsonBodyProcessor(testResponse)!;

      await expect(
        jsonBodyProcessor({
          jsonBody: {
            unknownProperty: '123',
          },
        }),
      ).rejects.toThrowWithMessage(InternalServerError, 'Failed to parse response body');
    });
  });

  describe('provideHeaderProcessor', () => {
    it('should return undefined when no direct response headers are provided', () => {
      const testResponse = getPartialFixture<DirectResponseObject>({});
      const headerProcessor = subject.provideHeaderProcessor(testResponse);

      expect(headerProcessor).toBeUndefined();
    });

    it('should add a header processor to the stack', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        headers: z.object({
          'test-header': z.string(),
        }) as ZodObject<Record<string, z.ZodString>>,
      });
      const headerProcessor = subject.provideHeaderProcessor(testResponse)!;

      const output = await headerProcessor({
        headers: {
          'test-header': 'test-value',
        },
      });

      expect(output.headers).toEqual({
        'test-header': 'test-value',
      });
    });

    it('should fail when the headers do not match the schema', async () => {
      const testResponse = getPartialFixture<DirectResponseObject>({
        headers: z.object({
          'test-header': z.string(),
        }) as ZodObject<Record<string, z.ZodString>>,
      });
      const headerProcessor = subject.provideHeaderProcessor(testResponse)!;

      await expect(
        headerProcessor({
          headers: {
            'unknown-header': '123',
          },
        }),
      ).rejects.toThrowWithMessage(InternalServerError, 'Response headers do not match direct response headers schema');
    });
  });
});
