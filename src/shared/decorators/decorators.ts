import { InvocationContext } from '@azure/functions';
import { AZURE_FUNCTION_METADATA_KEY, AzureFunctions, PlatformError } from '../platform.model';
import { ArgMetadata, ArgMetadataProvider, ArgsMetadata, CommonArgMetadata } from './decorators.model';

export function adjustMetadata<T extends ArgMetadata>(
  metadataKey: unknown,
  operationArg: T,
  argMetadaProvider: ArgMetadataProvider<T>,
): (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) => void {
  return function (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) {
    const metadata: ArgsMetadata<T> =
      Reflect.getOwnMetadata(metadataKey, target, propertyKey) ??
      initializeMetadata(target, propertyKey, argMetadaProvider);
    metadata.args[parameterIndex] = operationArg;
    Reflect.defineMetadata(metadataKey, metadata, target, propertyKey);
  };
}

export function initializeMetadata<T extends ArgMetadata>(
  target: AzureFunctions,
  propertyKey: string | symbol,
  argMetadaProvider: ArgMetadataProvider<T>,
): ArgsMetadata<T> {
  const paramTypes = Reflect.getOwnMetadata('design:paramtypes', target, propertyKey) as unknown[] | undefined;
  if (!paramTypes) {
    throw new PlatformError(
      `Method ${target.constructor.name}.${String(propertyKey)} doesn't exist or has no metadata. Be sure to import reflect-metadata.`,
    );
  }
  return {
    args: paramTypes.map(paramType => argMetadaProvider(paramType)),
  };
}

export function getCommonArg(paramType: unknown): CommonArgMetadata {
  if (paramType === InvocationContext) {
    return { type: 'context' };
  } else {
    return { type: 'undefined' };
  }
}

export function Context() {
  return adjustMetadata(
    AZURE_FUNCTION_METADATA_KEY,
    {
      type: 'context',
    },
    getCommonArg,
  );
}
