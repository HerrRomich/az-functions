import { AzFunctionsSystemError } from '../platform.model';

export interface ArgMetadata {
  type: string;
}

export interface CommonArgMetadata extends ArgMetadata {
  type: 'invocationContext' | 'undefined';
}

export interface ArgsMetadata<T extends ArgMetadata> {
  args: T[];
}

export type ArgMetadataProvider<T extends ArgMetadata> = (paramType: unknown) => T;

export class AzFunctionsDecoratorError extends AzFunctionsSystemError {}
