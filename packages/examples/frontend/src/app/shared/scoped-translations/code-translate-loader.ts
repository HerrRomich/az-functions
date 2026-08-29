import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import * as lodash from 'lodash-es';
import { from, map, Observable, of } from 'rxjs';
import { TranslationBundleLoaders } from './scoped-translations.model';

export class CodeTranslateLoader implements TranslateLoader {
  constructor(
    private readonly bundleLoaders: TranslationBundleLoaders,
    private readonly namespace: string,
  ) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    const loadBundle = this.bundleLoaders[lang];
    if (loadBundle !== undefined) {
      return from(loadBundle()).pipe(
        map(nestedTranslations => {
          let prefixedTranslations: TranslationObject = {};
          if (this.namespace) {
            lodash.set(prefixedTranslations, this.namespace, nestedTranslations);
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
