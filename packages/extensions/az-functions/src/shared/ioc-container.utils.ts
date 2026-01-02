import { ServiceIdentifier } from 'inversify';

export function serviceIdentifier<T>(identifier: string): ServiceIdentifier<T> {
  return Symbol.for(identifier);
}
