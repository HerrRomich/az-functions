import { TranslationObject } from '@ngx-translate/core';
import { TranslationLanguage } from '../translations';

export type TranslationBundleLoaders = Partial<Record<TranslationLanguage, () => Promise<TranslationObject>>>;
