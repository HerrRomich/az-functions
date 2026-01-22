import * as sourceMapSupport from '@forks/source-map-support';
import './init';

jest.mock('@forks/source-map-support', () => ({
  install: jest.fn(),
}));

describe('Initialization', () => {
  describe('Source Map Support', () => {
    it('should load source map support without errors', () => {
      expect(sourceMapSupport.install).toHaveBeenCalledWith({
        environment: 'node',
        overrideRetrieveFile: false,
      });
    });
  });
});
