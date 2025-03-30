import { controller } from '../http-controller';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';

@controller({
  path: 'test-path',
  tags: ['tag1', 'tag2'],
  application: 'test-application',
})
class TestAzureFunction {}

describe('test', () => {
  let subject: PlatformComponentMetadataService;

  beforeEach(() => {
    subject = new PlatformComponentMetadataService();
  });

  describe('getMetadata', () => {
    it('should return metadata for HTTP controller', () => {
      expect.assertions(3);
      const metadata = subject.getMetadata(TestAzureFunction);
      if (metadata?.type === 'http-controller') {
        expect(metadata.path).toEqual('test-path');
        expect(metadata.tags).toEqual(['tag1', 'tag2']);
        expect(metadata.application).toEqual('test-application');
      }
    });
  });
});
