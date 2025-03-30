import { z } from 'zod';
import { body, controller, get } from './decorators';
import { HttpControllerMetadataService } from './http-controller-metadata.service';

@controller({
  path: 'test-path',
  tags: ['tag1', 'tag2'],
  application: 'test-application',
})
class TestHttpController {
  @get({
    path: 'test-path',
  })
  async getTestData(@body({ schema: z.object({ text: z.string() }) }) _body: never): Promise<string> {
    return 'test-value';
  }
}

describe('HttpControllerMetadataService', () => {
  let subject: HttpControllerMetadataService;

  beforeEach(() => {
    subject = new HttpControllerMetadataService();
  });

  it('should return controller metadata', () => {
    const operationMetadata = subject.getOperationMetadata(new TestHttpController(), 'getTestData');

    expect(operationMetadata).toMatchObject({
      path: 'test-path',
      method: 'get',
      args: [{ type: 'body' }],
    });
  });
});
