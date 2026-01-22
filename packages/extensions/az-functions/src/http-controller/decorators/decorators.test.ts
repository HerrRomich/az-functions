import { HttpRequest, InvocationContext } from '@azure/functions';
import { AuthContext } from 'security';
import { FUNCTION_HANDLER_METADATA, InvocationCtx } from 'shared';
import { z } from 'zod';
import {
  AuthCtx,
  Body,
  Delete,
  Get,
  Head,
  HeaderParam,
  HttpController,
  Patch,
  PathParam,
  Post,
  Put,
  QueryParam,
  Request,
} from './decorators';
import {
  ControllerConfig,
  ControllerOperationConfig,
  ControllerRequestBodyOperationConfig,
  HTTP_CONTROLLER_TYPE,
} from './decorators.model';

const testControllerConfig: ControllerConfig = {
  path: 'test-path',
  tags: ['tag1', 'tag2'],
  application: 'test-application',
};

const testControllerOperationConfig: ControllerOperationConfig = {
  operationId: 'test-controllerMethod',
  path: 'test-path',
};

const testControllerRequestBodyOperationConfig: ControllerRequestBodyOperationConfig = {
  operationId: 'test-controllerMethod',
  path: 'test-path',
  requestBody: {
    content: {
      'application/json': {},
    },
  },
};

@HttpController(testControllerConfig)
class TestController {
  @Get(testControllerOperationConfig)
  async testGetRequest(
    @AuthCtx() _1: AuthContext,
    _2: number,
    @Request() _3: HttpRequest,
    @InvocationCtx() _4: InvocationContext,
  ) {
    console.log('get-request');
  }

  @Head(testControllerOperationConfig)
  async testHeadRequest(@HeaderParam({ name: 'test-header', schema: z.string() }) _1: string, _2: string) {
    console.log('head-request');
  }

  @Delete(testControllerOperationConfig)
  async testDeleteRequest(@Request() _1: HttpRequest, _2: { param: string }) {
    console.log('delete-request');
  }

  @Post(testControllerRequestBodyOperationConfig)
  async testPostRequest(@AuthCtx() _1: AuthContext, @Body({ schema: z.string() }) _2: string) {
    console.log('post-request');
  }

  @Put(testControllerRequestBodyOperationConfig)
  async testPutRequest(@PathParam({ name: 'test-path', schema: z.string() }) _1: string, @AuthCtx() _2: AuthContext) {
    console.log('put-request');
  }

  @Patch(testControllerRequestBodyOperationConfig)
  async testPatchRequest(
    @QueryParam({ name: 'test-query', schema: z.string().array() }) _1: HttpRequest,
    _2: { param: string },
  ) {
    console.log('patch-request');
  }

  @Get(testControllerOperationConfig)
  async TestInvalidMethodName() {
    console.log('invalid-method-name');
  }
}

describe('decorators', () => {
  let testController: TestController;

  beforeEach(() => {
    testController = new TestController();
  });

  describe('Controller', () => {
    it('should provide controller with metadata', () => {
      const metadataKeys = Reflect.getMetadataKeys(TestController);
      expect(metadataKeys).toEqual([FUNCTION_HANDLER_METADATA, '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, TestController)).toEqual({
        type: 'http-controller',
        path: 'test-path',
        tags: ['tag1', 'tag2'],
        application: 'test-application',
      });
    });
  });

  describe('controllerMethod decorators without body', () => {
    describe('Get', () => {
      it('should provide controllerMethod with metadata', () => {
        const metadata = Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testGetRequest');

        expect(metadata).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'get',
          args: [
            {
              type: 'authContext',
            },
            {
              type: 'undefined',
            },
            {
              type: 'request',
            },
            {
              type: 'invocationContext',
            },
          ],
        });
      });
    });

    describe('Head', () => {
      it('should provide controllerMethod with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testHeadRequest')).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'head',
          args: [
            {
              type: 'header',
              name: 'test-header',
              schema: expect.anything(),
            },
            {
              type: 'undefined',
            },
          ],
        });
      });
    });

    describe('Delete', () => {
      it('should provide controllerMethod with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testDeleteRequest')).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'delete',
          args: [
            {
              type: 'request',
            },
            {
              type: 'undefined',
            },
          ],
        });
      });
    });
  });

  describe('controllerMethod decorators with body', () => {
    describe('Post', () => {
      it('should provide controllerMethod with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testPostRequest')).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'post',
          requestBody: {
            content: {
              'application/json': {},
            },
          },
          args: [
            {
              type: 'authContext',
            },
            {
              type: 'body',
              schema: expect.anything(),
            },
          ],
        });
      });
    });

    describe('Put', () => {
      it('should provide controllerMethod with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testPutRequest')).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'put',
          requestBody: {
            content: {
              'application/json': {},
            },
          },
          args: [
            {
              type: 'path',
              name: 'test-path',
              schema: expect.anything(),
            },
            {
              type: 'authContext',
            },
          ],
        });
      });
    });

    describe('Patch', () => {
      it('should provide controllerMethod with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testController, 'testPatchRequest')).toEqual({
          type: HTTP_CONTROLLER_TYPE,
          operationId: 'test-controllerMethod',
          path: 'test-path',
          method: 'patch',
          requestBody: {
            content: {
              'application/json': {},
            },
          },
          args: [
            {
              type: 'query',
              name: 'test-query',
              schema: expect.anything(),
            },
            {
              type: 'undefined',
            },
          ],
        });
      });
    });
  });
});
