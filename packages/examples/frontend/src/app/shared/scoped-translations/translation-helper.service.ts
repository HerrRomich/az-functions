import { inject, Injectable } from '@angular/core';
import { ITranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { ScopedTranslateService } from './scoped-translate.service';

@Injectable()
export class TranslationHelperService {
  private readonly scopedTranslateService = inject(ScopedTranslateService);

  getKeyPrefix(): string {
    return this.scopedTranslateService.getKeyPrefix();
  }

  getScopedTranslateService(): ScopedTranslateService {
    return this.scopedTranslateService;
  }

  getTranslateService(): TranslateService {
    return this.scopedTranslateService.getTranslateService();
  }

  getTranslation<T extends string>(keys: Record<T, string>, params?: object): Observable<Record<T, string>> {
    const translateService = this.getTranslateService();
    return this.getTranslationObservable(translateService, keys, params);
  }

  getScopedTranslation<T extends string>(keys: Record<T, string>, params?: object): Observable<Record<T, string>> {
    const translateService = this.getScopedTranslateService();
    return this.getTranslationObservable(translateService, keys, params);
  }

  private getTranslationObservable<T extends string>(
    translateService: ITranslateService,
    keys: Record<T, string>,
    params: object | undefined,
  ) {
    return translateService.get(Object.values(keys), params).pipe(
      map(translations => {
        const result = { ...keys };
        for (const alias in keys) {
          const key = keys[alias];
          result[alias] = translations[key];
        }
        return result;
      }),
    );
  }

  async getTranslationPromise<T extends string>(keys: Record<T, string>, params?: object): Promise<Record<T, string>> {
    return await firstValueFrom(this.getTranslation(keys, params));
  }

  async getScopedTranslationPromise<T extends string>(
    keys: Record<T, string>,
    params?: object,
  ): Promise<Record<T, string>> {
    return await firstValueFrom(this.getScopedTranslation(keys, params));
  }

  toScopedKeys<T extends string>(keys: Record<T, string>): Record<T, string> {
    const result = { ...keys };
    for (const alias in keys) {
      const key = keys[alias];
      result[alias] = this.scopedTranslateService.toScopedKey(key);
    }
    return result;
  }
}
