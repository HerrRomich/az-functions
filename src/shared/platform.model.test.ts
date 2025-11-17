import * as util from 'node:util';
import { errorToString } from './platform.model';

describe('Platform model', () => {
  describe('errorToString', () => {
    it('should return message for Error', () => {
      const error = new Error('Test error message');
      const result = errorToString(error);
      expect(result).toBe('Test error message');
    });

    it('should return string for string input', () => {
      const input = 'Just a string';
      const result = errorToString(input);
      expect(result).toBe('Just a string');
    });

    it('should return inspected object for object input', () => {
      const input = { key: 'value', nested: { num: 42 } };
      const result = errorToString(input);
      expect(result).toInclude("key: 'value'");
      expect(result).toInclude('nested: { num: 42 }');
    });

    it('should return string representation for null', () => {
      const input = null;
      const result = errorToString(input);
      expect(result).toBe('null');
    });

    it('should return string representation for undefined', () => {
      const input = undefined;
      const result = errorToString(input);
      expect(result).toBe('undefined');
    });

    it('should return string representation for error if object inspection fails', () => {
      const circularObj: any = {};
      jest.spyOn(util, 'inspect').mockImplementation(() => {
        throw new Error('Inspection failed');
      });
      circularObj.self = circularObj;
      const result = errorToString(circularObj);
      expect(result).toBe('[object Object]');
    });
  });
});
