import { z } from 'zod';

export interface ArgMetadata {
  type: string;
}

export interface CommonArgMetadata extends ArgMetadata {
  type: 'context' | 'undefined';
}

export interface ArgsMetadata<T extends ArgMetadata> {
  args: T[];
}

export type ArgMetadataProvider<T extends ArgMetadata> = (paramType: unknown) => T;

export const stringSchema = z.string();
export const optionalStringSchema = stringSchema.optional();
export const numberSchema = z.number();
