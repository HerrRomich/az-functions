import * as crypto from 'crypto';

export function stringsToKey(...strings: string[]): string {
  return strings.map(str => `${str.length}${str}`).join('');
}

export function stringToBucket(input: string, buckets: number, seed: string = ''): number {
  const hash = crypto.createHash('sha256').update(seed).update(input).digest('hex');
  const intValue = parseInt(hash.slice(0, 16), 16);
  return intValue % buckets;
}

export function stringToHashString(str: string, hashDigits: number, seed: string = '', radix: number = 10): string {
  const bucketCount = 10 ** hashDigits;
  const bucketNumber = stringToBucket(str, bucketCount, seed);
  return bucketNumber.toString(radix).padStart(hashDigits, '0');
}

export type ElementOfPromiseArray<T> = T extends Promise<infer R> ? (R extends Array<infer U> ? U : never) : never;
