import { SYSTEM_LOGGER_NAME_PREFIX } from 'logger';

const regexp =
  // eslint-disable-next-line sonarjs/regex-complexity,sonarjs/slow-regex
  /^\s*at\s+(?:(?:new\s+(?<constructor>[\w$]+))|(?:(?:Object\.)?(?<function>[\w$]+))|(?:(?<class>[\w$]+)\.(?:[\w$+]+)))\s+(?:\[as\s[\w$]+\]\s)?(?:\(.*packages[\\/]extensions[\\/]az-functions[\\/]src(?<path>(?:[\\/][^:)\\/]*)*)[\\/].*\.ts:\d*:\d+\))$/;

export function systemLoggerNameProvider(stackEntry?: string): string | undefined {
  const stackLines = stackEntry?.split('\n') ?? [];
  let callerLine = stackLines.shift();
  while (callerLine !== undefined) {
    const match = regexp.exec(callerLine.trim());
    if (match !== null) {
      const path = match.groups?.['path']?.replace(/\//g, '.');
      const prefix = match.groups?.['constructor'] ?? match.groups?.['class'] ?? match.groups?.['function'];
      return `${SYSTEM_LOGGER_NAME_PREFIX}${path}.${prefix}`;
    } else {
      callerLine = stackLines.shift();
    }
  }
}
