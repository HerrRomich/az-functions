export type ElementOfPromiseArray<T> = T extends Promise<infer R> ? (R extends (infer U)[] ? U : never) : never;
