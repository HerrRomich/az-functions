import { z } from 'zod';

export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogLevelsSchema = z.record(z.string(), LogLevelSchema);
export type LogLevels = z.infer<typeof LogLevelsSchema>;
