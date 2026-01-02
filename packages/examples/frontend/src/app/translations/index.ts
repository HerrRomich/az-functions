export * from './de';
export * from './en';

export const TRANSLATION_LANGUAGES = ['en', 'de'] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];
