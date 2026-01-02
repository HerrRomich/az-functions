import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import * as lodash from 'lodash';
import { from, map, Observable, of } from 'rxjs';
import { TranslationLanguage } from '../translations';
import { TranslationBundleLoaders } from './scoped-translations.model';

export class CodeTranslateLoader implements TranslateLoader {
  constructor(
    private readonly bundleLoaders: TranslationBundleLoaders,
    private readonly translationKeyPrefix: string,
  ) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    const loadBundle = this.bundleLoaders[lang as TranslationLanguage];
    if (loadBundle !== undefined) {
      return from(loadBundle()).pipe(
        map(nestedTranslations => {
          let prefixedTranslations: TranslationObject = {};
          if (this.translationKeyPrefix) {
            lodash.set(prefixedTranslations, this.translationKeyPrefix, nestedTranslations);
          } else {
            prefixedTranslations = lodash.cloneDeep(nestedTranslations);
          }
          return prefixedTranslations;
        }),
      );
    } else {
      return of({});
    }
  }
}
