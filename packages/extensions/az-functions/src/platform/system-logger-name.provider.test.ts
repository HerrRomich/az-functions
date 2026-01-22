import { systemLoggerNameProvider } from './system-logger-name.provider';

describe('SystemLoggerNameProvider', () => {
  it('should return undefined for undefined stack entry', () => {
    expect(systemLoggerNameProvider()).toBeUndefined();
  });

  it('should return undefined for wrong stack entry', () => {
    expect(systemLoggerNameProvider('invalid stack entry')).toBeUndefined();
  });

  it('should return correct logger name for valid stack entry in root path', () => {
    const stackEntry = `Error: Test error
    at myFunction (packages/extensions/az-functions/src/index.ts:10:15)`;
    expect(systemLoggerNameProvider(stackEntry)).toBe('#az-functions.myFunction');
  });

  it('should return correct logger name for valid function stack entry', () => {
    const stackEntry = `Error: Test error
    at myFunction (packages/extensions/az-functions/src/platform/system-logger-name.provider.ts:10:15)`;
    expect(systemLoggerNameProvider(stackEntry)).toBe('#az-functions.platform.myFunction');
  });

  it('should return correct logger name for valid class method stack entry', () => {
    const stackEntry = `Error: Test error
    at MyClass.myMethod (packages/extensions/az-functions/src/platform/system-logger-name.provider.ts:20:25)`;

    expect(systemLoggerNameProvider(stackEntry)).toBe('#az-functions.platform.MyClass');
  });

  it('should return correct logger name for valid constructor stack entry', () => {
    const stackEntry = `Error: Test error
    at new MyClass (packages/extensions/az-functions/src/platform/system-logger-name.provider.ts:30:35)`;

    expect(systemLoggerNameProvider(stackEntry)).toBe('#az-functions.platform.MyClass');
  });
});
