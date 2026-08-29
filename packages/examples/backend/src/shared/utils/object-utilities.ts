export function typedKeys<T extends object>(o: T): (keyof T)[] {
  return Object.keys(o) as (keyof T)[];
}
