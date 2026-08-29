import { z } from 'zod';

export const translationQuerySchema = z.object({
  key: z.string(),
  params: z.record(z.string(), z.string()).optional(),
});
export type TranslationQuery = z.infer<typeof translationQuerySchema>;

export const OptTranslationSchema = z.union([z.string(), translationQuerySchema]);
export type OptTranslation = z.infer<typeof OptTranslationSchema>;
