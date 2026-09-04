import { HttpRequest, HttpResponse } from '@azure/functions';
import { PlatformContextManager } from 'context';
import { AzFunctionsError } from 'shared';
import { ZodType } from 'zod';
import { CONTEXT_LOGGER_METADATA, ContextLoggerMetadata, LogLevel, SanitizerOptions } from './logger.model';

export type AnyValueScalar = string | number | boolean;
export type AnyValueArray = AnyValue[];
export interface AnyValueMap {
  [attributeKey: string]: AnyValue;
}
export type AnyValue = AnyValueScalar | Uint8Array | AnyValueArray | AnyValueMap | null | undefined;

const MAX_DEPTH = 5;
const MAX_TRACE_LENGTH = 10;
const MAX_ARRAY_LENGTH = 20;
const MAX_KEYS_COUNT = 20;
const MAX_STRING_LENGTH = 250;

function sanitizeHeaders(headers: Headers) {
  return Array.from(headers.entries()).reduce<Record<string, string>>((acc, [key, val]) => {
    if (!['authorization', 'cookie', 'x-ms'].some(prefix => key.toLowerCase().startsWith(prefix))) {
      acc[key] = val;
    } else {
      acc[key] = '[REDACTED]';
    }
    return acc;
  }, {});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getZodCheckDef(value: any): object | undefined {
  const def = value?._zod?.def;
  if (typeof def === 'object' && def !== null && 'check' in def && typeof def.check === 'string') {
    return def;
  }
  return undefined;
}

interface SanitizeContext {
  limits: Required<SanitizerOptions>;
  objectsStack: WeakSet<object>;
  sanitize: (value: unknown, depth: number) => AnyValue;
}

function truncateList(items: AnyValue[], maxArrayLength: number): AnyValue[] {
  return items.length > maxArrayLength
    ? [...items.slice(0, maxArrayLength), `... more ${items.length - maxArrayLength} items`]
    : items;
}

function truncateEntries(entries: (readonly [string, AnyValue])[], maxKeysCount: number): AnyValueMap {
  if (entries.length > maxKeysCount) {
    return {
      ...Object.fromEntries(entries.slice(0, maxKeysCount)),
      __meta__: {
        truncated: true,
        totalKeys: entries.length,
        omittedKeys: entries.length - maxKeysCount,
      },
    };
  }
  return Object.fromEntries(entries);
}

function sanitizeError(error: Error, depth: number, ctx: SanitizeContext): AnyValue {
  if (depth > ctx.limits.maxDepth) {
    return `[Error<${error.name}>]`;
  }
  const stackLines = error.stack?.split('\n');
  const { maxTraceLength } = ctx.limits;
  return {
    name: error.name,
    message: error.message,
    ...(stackLines
      ? {
          stack:
            stackLines.length > maxTraceLength
              ? [...stackLines.slice(0, maxTraceLength), `... more ${stackLines.length - maxTraceLength} lines`].join(
                  '\n',
                )
              : error.stack,
        }
      : {}),
    ...(error.cause ? { cause: ctx.sanitize(error.cause, depth + 1) } : {}),
    ...(error instanceof AzFunctionsError ? { details: ctx.sanitize(error.details, depth + 1) } : {}),
  };
}

function sanitizeRequest(value: HttpRequest, depth: number, ctx: SanitizeContext): AnyValue {
  if (depth > ctx.limits.maxDepth) {
    return '[HttpRequest]';
  }
  const headers = sanitizeHeaders(value.headers);
  const contentLength = headers['content-length'];
  return {
    method: value.method,
    url: value.url,
    headers,
    query: Object.fromEntries(value.query.entries()),
    params: value.params,
    ...(contentLength ? { body: `[RequestBody<${contentLength}Byte>]` } : {}),
  };
}

function sanitizeResponse(value: HttpResponse, depth: number, ctx: SanitizeContext): AnyValue {
  if (depth > ctx.limits.maxDepth) {
    return '[HttpResponse]';
  }
  const headers = sanitizeHeaders(value.headers);
  const contentLength = headers['content-length'];
  return {
    status: value.status,
    headers,
    ...(contentLength ? { body: `[ResponseBody<${contentLength}>Bytes]` } : {}),
  };
}

function sanitizeCollection(
  value: unknown[] | Map<unknown, unknown> | Set<unknown>,
  depth: number,
  ctx: SanitizeContext,
): AnyValue {
  const { maxDepth, maxArrayLength, maxKeysCount } = ctx.limits;

  if (Array.isArray(value)) {
    if (depth > maxDepth) return `[Array<${value.length}>]`;
    if (value.length === 0) return '[empty Array]';
    return truncateList(
      value.map(v => ctx.sanitize(v, depth + 1)),
      maxArrayLength,
    );
  }

  if (value instanceof Map) {
    if (depth > maxDepth) return `[Map<${value.size}>]`;
    if (value.size === 0) return '[empty map]';
    const entries = [...value.entries()].map(([k, v]) => [String(k), ctx.sanitize(v, depth + 1)] as const);
    return truncateEntries(entries, maxKeysCount);
  }

  // Set
  if (depth > maxDepth) return `[Set<${value.size}>]`;
  if (value.size === 0) return '[empty set]';
  return truncateList(
    [...value].map(v => ctx.sanitize(v, depth + 1)),
    maxArrayLength,
  );
}

function sanitizeObject(value: object, depth: number, ctx: SanitizeContext): AnyValue {
  const objectName = value.constructor.name;
  if (depth > ctx.limits.maxDepth) return `[${objectName}]`;
  if (Object.keys(value).length === 0) return `[empty ${objectName}]`;
  if (ctx.objectsStack.has(value)) return '[Circular]';

  ctx.objectsStack.add(value);
  const entries = truncateEntries(
    Object.entries(value).map(([k, v]) => [k, ctx.sanitize(v, depth + 1)] as const),
    ctx.limits.maxKeysCount,
  );
  ctx.objectsStack.delete(value);
  return entries;
}

function sanitizePrimitive(value: unknown, maxStringLength: number): AnyValue | typeof UNHANDLED {
  if (value === undefined || value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > maxStringLength ? `${value.slice(0, maxStringLength)}...` : value;
  }
  if (typeof value === 'symbol') {
    return `[Symbol(${value.description})]`;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  return UNHANDLED;
}

const UNHANDLED = Symbol('unhandled');

export function sanitizeMetadata(metadata: unknown, options?: SanitizerOptions): AnyValueMap {
  const ctx: SanitizeContext = {
    limits: {
      maxDepth: options?.maxDepth ?? MAX_DEPTH,
      maxTraceLength: options?.maxTraceLength ?? MAX_TRACE_LENGTH,
      maxArrayLength: options?.maxArrayLength ?? MAX_ARRAY_LENGTH,
      maxKeysCount: options?.maxKeysCount ?? MAX_KEYS_COUNT,
      maxStringLength: options?.maxStringLength ?? MAX_STRING_LENGTH,
    },
    objectsStack: new WeakSet(),
    sanitize: (value, depth) => sanitize(value, depth),
  };

  function sanitize(value: unknown, depth: number): AnyValue {
    const primitive = sanitizePrimitive(value, ctx.limits.maxStringLength);
    if (primitive !== UNHANDLED) {
      return primitive;
    }

    if (value instanceof ZodType) {
      return sanitize(value.def, depth + 1);
    }
    const zodCheckDef = getZodCheckDef(value);
    if (zodCheckDef !== undefined) {
      return sanitize(zodCheckDef, depth + 1);
    }

    if (Array.isArray(value) || value instanceof Map || value instanceof Set) {
      return sanitizeCollection(value, depth, ctx);
    }
    if (value instanceof Error) {
      return sanitizeError(value, depth, ctx);
    }
    if (value instanceof HttpRequest) {
      return sanitizeRequest(value, depth, ctx);
    }
    if (value instanceof HttpResponse) {
      return sanitizeResponse(value, depth, ctx);
    }
    if (typeof value === 'object' && value !== null) {
      return sanitizeObject(value, depth, ctx);
    }

    return undefined;
  }

  return sanitize(metadata, 1) as AnyValueMap;
}

export function adjustContextLoggerMetadata(contextManager: PlatformContextManager, metadata: ContextLoggerMetadata) {
  const currentContext = contextManager.active();
  if (currentContext === undefined) {
    return;
  }
  const existingMetadata = currentContext.getValue(CONTEXT_LOGGER_METADATA) ?? {};
  const newMetadata: ContextLoggerMetadata = { ...existingMetadata };

  for (const level in metadata) {
    const typedLevel = level as LogLevel;
    newMetadata[typedLevel] = {
      ...newMetadata[typedLevel],
      ...metadata[typedLevel],
    };
  }

  currentContext.setValue(CONTEXT_LOGGER_METADATA, newMetadata);
}
