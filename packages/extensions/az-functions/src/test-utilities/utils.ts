import { PartialDeep } from 'type-fest';

export function getPartialFixture<T>(fixture?: PartialDeep<T>): T {
  return (fixture ?? {}) as T;
}
