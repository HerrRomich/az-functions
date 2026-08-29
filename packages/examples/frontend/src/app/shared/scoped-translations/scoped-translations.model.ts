import { TranslationObject } from '@ngx-translate/core';

export type TranslationBundleLoaders = Record<string, () => Promise<TranslationObject>>;
