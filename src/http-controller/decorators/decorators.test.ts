import { HttpRequest, InvocationContext } from '@azure/functions';
import { AZURE_FUNCTION_METADATA_KEY, UserAccount } from 'shared';
import { z } from 'zod';
import {
  httpBody,
  httpController,
  httpDelete,
  httpGet,
  httpHead,
  httpHeaderParam,
  httpPatch,
  httpPathParam,
  httpPost,
  httpPut,
  httpQueryParam,
  httpRequest,
  user,
} from './decorators';
import {
  ControllerConfig,
  ControllerOperationConfig,
  ControllerRequestBodyOperationConfig,
  HTTP_OPERATION_METADATA_KEY,
} from './decorators.model';

const testControllerConfig: ControllerConfig = {
  path: 'test-path',
  tags: ['tag1', 'tag2'],
  application: 'test-application',
};

const testControllerOperationConfig: ControllerOperationConfig = {
  operationId: 'test-operation',
  path: 'test-path',
};

const testControllerRequestBodyOperationConfig: ControllerRequestBodyOperationConfig = {
  operationId: 'test-operation',
  path: 'test-path',
  requestBody: {
    content: {
      'application/json': {},
    },
  },
};

@httpController(testControllerConfig)
class TestController {
  @httpGet(testControllerOperationConfig)
  async testGetRequest(@user() _1: UserAccount, _2: number, _3: HttpRequest, _4: InvocationContext) {
    console.log('get-request');
  }

  @httpHead(testControllerOperationConfig)
  async testHeadRequest(@httpHeaderParam({ name: 'test-header', schema: z.string() }) _1: string, _2: string) {
    console.log('head-request');
  }

  @httpDelete(testControllerOperationConfig)
  async testDeleteRequest(@httpRequest() _1: HttpRequest, _2: { param: string }) {
    console.log('delete-request');
  }

  @httpPost(testControllerRequestBodyOperationConfig)
  async testPostRequest(@user() _1: UserAccount, @httpBody({ schema: z.string() }) _2: string) {
    console.log('post-request');
  }

  @httpPut(testControllerRequestBodyOperationConfig)
  async testPutRequest(@httpPathParam({ name: 'test-path', schema: z.string() }) _1: string, @user() _2: UserAccount) {
    console.log('put-request');
  }

  @httpPatch(testControllerRequestBodyOperationConfig)
  async testPatchRequest(
    @httpQueryParam({ name: 'test-query', schema: z.string().array() }) _1: HttpRequest,
    _2: { param: string },
  ) {
    console.log('patch-request');
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
      expect(metadataKeys).toEqual(['azure_function', '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, TestController)).toEqual({
        type: 'http-controller',
        path: 'test-path',
        tags: ['tag1', 'tag2'],
        application: 'test-application',
      });
    });
  });

  describe('operation decorators without body', () => {
    describe('Get', () => {
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testGetRequest')).toEqual({
          operationId: 'test-operation',
          path: 'test-path',
          method: 'get',
          args: [
            {
              type: 'user',
            },
            {
              type: 'undefined',
            },
            {
              type: 'request',
            },
            {
              type: 'context',
            },
          ],
        });
      });
    });

    describe('Head', () => {
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testHeadRequest')).toEqual({
          operationId: 'test-operation',
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
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testDeleteRequest')).toEqual({
          operationId: 'test-operation',
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

  describe('operation decorators with body', () => {
    describe('Post', () => {
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testPostRequest')).toEqual({
          operationId: 'test-operation',
          path: 'test-path',
          method: 'post',
          requestBody: {
            content: {
              'application/json': {},
            },
          },
          args: [
            {
              type: 'user',
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
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testPutRequest')).toEqual({
          operationId: 'test-operation',
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
              type: 'user',
            },
          ],
        });
      });
    });

    describe('Patch', () => {
      it('should provide operation with metadata', () => {
        expect(Reflect.getMetadata(HTTP_OPERATION_METADATA_KEY, testController, 'testPatchRequest')).toEqual({
          operationId: 'test-operation',
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
