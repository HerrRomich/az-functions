import { ServiceIdentifier } from 'inversify';

/**
 * Creates a typed service identifier for use with InversifyJS.
 * @param key The unique key for the service.
 * @returns A symbol that can be used as a service identifier.
 */
export function serviceIdentifier<T>(key: string): ServiceIdentifier<T> {
  return Symbol.for(key);
}
