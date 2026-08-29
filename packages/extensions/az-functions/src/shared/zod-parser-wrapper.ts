import { z, ZodError } from 'zod';

export class ZodParserError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function formatZodErrorIssues(error: ZodError) {
  const lines: string[] = [];
  for (const issue of error.issues.slice(0, 5)) {
    lines.push(`✖ ${issue.message}`);
    lines.push(`  → at ${toDotPath(issue.path)}`);
  }
  if (error.issues.length > 5) {
    lines.push(`... and ${error.issues.length - 5} more issues`);
  }

  return lines.join('\n');
}

export function parseWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const safeParse = schema.safeParse(data);
  if (safeParse.success) {
    return safeParse.data;
  } else {
    const error = safeParse.error;
    const zodErrorIssues = formatZodErrorIssues(error);
    const message = `Error parsing data:
${zodErrorIssues}`;
    throw new ZodParserError(message);
  }
}

function toDotPath(path: PropertyKey[]): string {
  const segs: string[] = [];
  for (const seg of path) {
    if (typeof seg === 'number') segs.push(`[${seg}]`);
    else if (typeof seg === 'symbol' || /[^\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length) segs.push('.');
      segs.push(seg);
    }
  }

  return segs.join('');
}
