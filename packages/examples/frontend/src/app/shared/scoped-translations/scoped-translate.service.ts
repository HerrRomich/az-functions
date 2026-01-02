import { inject, Injectable } from '@angular/core';
import {
  FallbackLangChangeEvent,
  InterpolatableTranslationObject,
  InterpolationParameters,
  ITranslateService,
  LangChangeEvent,
  Language,
  StrictTranslation,
  TranslateService,
  Translation,
  TranslationChangeEvent,
  TranslationObject,
} from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { SCOPED_TRANSLATION_KEY_PREFIX_TOKEN } from './scoped-translate.providers';
@Injectable()
export class ScopedTranslateService implements ITranslateService {
  private readonly translationKeyPrefix = inject(SCOPED_TRANSLATION_KEY_PREFIX_TOKEN);
  private readonly translateService = inject(TranslateService);

  getKeyPrefix() {
    return this.translationKeyPrefix;
  }

  getTranslateService(): TranslateService {
    return this.translateService;
  }

  get onTranslationChange(): Observable<TranslationChangeEvent> {
    return this.translateService.onTranslationChange;
  }

  get onLangChange(): Observable<LangChangeEvent> {
    return this.translateService.onLangChange;
  }

  get onFallbackLangChange(): Observable<FallbackLangChangeEvent> {
    return this.translateService.onFallbackLangChange;
  }

  get onDefaultLangChange(): Observable<FallbackLangChangeEvent> {
    return this.translateService.onDefaultLangChange;
  }

  setFallbackLang(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.setFallbackLang(lang);
  }

  use(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.use(lang);
  }

  getCurrentLang(): Language {
    return this.translateService.getCurrentLang();
  }

  setTranslation(lang: Language, translations: TranslationObject, shouldMerge?: boolean): void {
    this.translateService.setTranslation(lang, translations, shouldMerge);
  }

  getLangs(): readonly Language[] {
    return this.translateService.getLangs();
  }

  getFallbackLang(): Language | null {
    return this.translateService.getFallbackLang();
  }

  getParsedResult(
    key: string | string[],
    interpolateParams?: InterpolationParameters,
  ): StrictTranslation | Observable<StrictTranslation> {
    return this.translateService.getParsedResult(this.toScopedKeys(key), interpolateParams);
  }

  toScopedKeys(key: string | string[]) {
    if (typeof key === 'string') {
      key = this.toScopedKey(key);
    } else if (Array.isArray(key)) {
      key = key.map(k => `${this.translationKeyPrefix}.${k}`);
    }
    return key;
  }

  toScopedKey(key: string) {
    return this.translationKeyPrefix ? `${this.translationKeyPrefix}.${key}` : key;
  }

  get(key: string | string[], interpolateParams?: InterpolationParameters): Observable<Translation> {
    return this.translateService.get(this.toScopedKeys(key), interpolateParams);
  }

  getStreamOnTranslationChange(
    key: string | string[],
    interpolateParams?: InterpolationParameters,
  ): Observable<Translation> {
    return this.translateService.getStreamOnTranslationChange(this.toScopedKeys(key), interpolateParams);
  }

  stream(key: string | string[], interpolateParams?: InterpolationParameters): Observable<Translation> {
    return this.translateService.stream(this.toScopedKeys(key), interpolateParams);
  }

  instant(key: string | string[], interpolateParams?: InterpolationParameters) {
    return this.translateService.instant(this.toScopedKeys(key), interpolateParams);
  }

  set(key: string, translation: string | TranslationObject, lang?: Language): void {
    this.translateService.set(this.toScopedKey(key), translation, lang);
  }

  reloadLang(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.reloadLang(lang);
  }

  resetLang(lang: Language): void {
    this.translateService.resetLang(lang);
  }

  getBrowserLang(): Language | undefined {
    return this.translateService.getBrowserLang();
  }

  getBrowserCultureLang(): Language | undefined {
    return this.translateService.getBrowserCultureLang();
  }

  setDefaultLang(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.setDefaultLang(lang);
  }

  getDefaultLang(): Language | null {
    return this.translateService.getDefaultLang();
  }

  get currentLang(): string {
    return this.translateService.currentLang;
  }

  get defaultLang(): string | null {
    return this.translateService.defaultLang;
  }

  get langs(): readonly Language[] {
    return this.translateService.langs;
  }

  addLangs(langs: string[]): void {
    this.translateService.addLangs(langs);
  }
}
