import { injectable } from 'inversify';
import * as crypto from 'node:crypto';

@injectable()
export class HashUtilitiesService {
  stringsToKey(...strings: string[]): string {
    return strings.map(str => `${str.length}${str}`).join('');
  }

  stringToBucket(input: string, buckets: number, seed = ''): number {
    const hash = crypto.createHash('sha256').update(seed).update(input).digest('hex');
    const intValue = parseInt(hash.slice(0, 16), 16);
    return intValue % buckets;
  }

  stringToHashString(str: string, hashDigits: number, seed = '', radix = 10): string {
    const bucketCount = 10 ** hashDigits;
    const bucketNumber = this.stringToBucket(str, bucketCount, seed);
    return bucketNumber.toString(radix).padStart(hashDigits, '0');
  }
}
