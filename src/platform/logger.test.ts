import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage } from '../shared/platform-context-local-storage';
import { Logger } from './logger';

describe('test Logger', () => {
  let subject: Logger;

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('testLogger without invocation context', () => {
    let storedConsole: typeof global.console;
    let mockedConsole: MockProxy<typeof global.console>;

    beforeEach(() => {
      const mockedContextStorage = mock<PlatformContextLocalStorage>();
      mockedContextStorage.getStore.mockReturnValue({
        invocationContext: undefined,
      });
      mockedConsole = mock<typeof global.console>();
      storedConsole = global.console;
      global.console = mockedConsole;
      subject = new Logger(mockedContextStorage);
    });

    afterEach(() => {
      global.console = storedConsole;
    });

    it('should call console.log', () => {
      subject.log('a', 'b', 'c');

      expect(mockedConsole.log).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console trace', () => {
      subject.trace('a', 'b', 'c');

      expect(mockedConsole.trace).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console info', () => {
      subject.info('a', 'b', 'c');

      expect(mockedConsole.info).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console debug', () => {
      subject.debug('a', 'b', 'c');

      expect(mockedConsole.debug).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console warn', () => {
      subject.warn('a', 'b', 'c');

      expect(mockedConsole.warn).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console error', () => {
      subject.error('a', 'b', 'c');

      expect(mockedConsole.error).toHaveBeenCalledWith('a', 'b', 'c');
    });
  });

  describe('testLogger with invocation context', () => {
    let mockedContext: MockProxy<InvocationContext>;

    beforeEach(() => {
      const mockedContextStorage = mock<PlatformContextLocalStorage>();
      mockedContext = mock<InvocationContext>();
      mockedContextStorage.getStore.mockReturnValue({
        invocationContext: mockedContext,
      });
      subject = new Logger(mockedContextStorage);
    });

    it('should call console.log', () => {
      subject.log('a', 'b', 'c');

      expect(mockedContext.log).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console trace', () => {
      subject.trace('a', 'b', 'c');

      expect(mockedContext.trace).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console info', () => {
      subject.info('a', 'b', 'c');

      expect(mockedContext.info).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console debug', () => {
      subject.debug('a', 'b', 'c');

      expect(mockedContext.debug).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console warn', () => {
      subject.warn('a', 'b', 'c');

      expect(mockedContext.warn).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call console error', () => {
      subject.error('a', 'b', 'c');

      expect(mockedContext.error).toHaveBeenCalledWith('a', 'b', 'c');
    });
  });
});
