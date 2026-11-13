import { inject, Injectable, Signal } from '@angular/core';
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
import { TRANSLATION_NAMESPACE_TOKEN } from './scoped-translate.providers';

@Injectable()
export class ScopedTranslateService implements ITranslateService {
  private readonly namespace = inject(TRANSLATION_NAMESPACE_TOKEN);
  private readonly translateService = inject(TranslateService);

  getNamespace() {
    return this.namespace;
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

  setFallbackLang(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.setFallbackLang(lang);
  }

  use(lang: Language): Observable<InterpolatableTranslationObject> {
    return this.translateService.use(lang);
  }

  getCurrentLang(): Language | null {
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
    lang?: Language,
  ): StrictTranslation | Observable<StrictTranslation> {
    return this.translateService.getParsedResult(this.toScopedKeys(key), interpolateParams, lang);
  }

  toScopedKeys(key: string | string[]): string | string[] {
    return Array.isArray(key) ? key.map(k => this.toScopedKey(k)) : this.toScopedKey(key);
  }

  toScopedKey(key: string) {
    return this.namespace ? `${this.namespace}.${key}` : key;
  }

  get(key: string | string[], interpolateParams?: InterpolationParameters, lang?: Language): Observable<Translation> {
    return this.translateService.get(this.toScopedKeys(key), interpolateParams, lang);
  }

  getStreamOnTranslationChange(
    key: string | string[],
    interpolateParams?: InterpolationParameters,
    lang?: Language,
  ): Observable<Translation> {
    return this.translateService.getStreamOnTranslationChange(this.toScopedKeys(key), interpolateParams, lang);
  }

  stream(
    key: string | string[],
    interpolateParams?: InterpolationParameters,
    lang?: Language,
  ): Observable<Translation> {
    return this.translateService.stream(this.toScopedKeys(key), interpolateParams, lang);
  }

  instant(key: string | string[], interpolateParams?: InterpolationParameters, lang?: Language): Translation {
    return this.translateService.instant(this.toScopedKeys(key), interpolateParams, lang);
  }

  translate(
    key: string | string[] | (() => string | string[]),
    params?: InterpolationParameters | (() => InterpolationParameters | undefined),
    lang?: Language | (() => Language | undefined),
  ): Signal<Translation | TranslationObject> {
    return this.translateService.translate(
      typeof key === 'function' ? () => this.toScopedKeys(key()) : this.toScopedKeys(key),
      params,
      lang,
    );
  }

  set(key: string, translation: string | TranslationObject, lang?: Language): void {
    this.translateService.set(this.toScopedKey(key), translation, lang);
  }

  setCompiledTranslation(lang: Language, translations: InterpolatableTranslationObject, shouldMerge?: boolean): void {
    this.translateService.setCompiledTranslation(lang, translations, shouldMerge);
  }

  getTranslations(language: Language): InterpolatableTranslationObject {
    return this.translateService.getTranslations(language);
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

  get currentLang(): Signal<Language | null> {
    return this.translateService.currentLang;
  }

  get fallbackLang(): Signal<Language | null> {
    return this.translateService.fallbackLang;
  }

  get fallbackLangs(): Signal<readonly Language[]> {
    return this.translateService.fallbackLangs;
  }

  get isLoading(): Signal<boolean> {
    return this.translateService.isLoading;
  }

  get onTranslationRefresh(): Observable<void> {
    return this.translateService.onTranslationRefresh;
  }

  addLangs(langs: string[]): void {
    this.translateService.addLangs(langs);
  }

  setFallbackLangs(langs: readonly Language[]): Observable<InterpolatableTranslationObject[]> {
    return this.translateService.setFallbackLangs(langs);
  }

  getFallbackLangs(): readonly Language[] {
    return this.translateService.getFallbackLangs();
  }

  deleteLanguage(lang: Language): void {
    this.translateService.deleteLanguage(lang);
  }

  getAsync(key: string | string[], interpolateParams?: InterpolationParameters, lang?: Language): Promise<Translation> {
    return this.translateService.getAsync(this.toScopedKeys(key), interpolateParams, lang);
  }

  hasTranslationKey(key: string, lang?: Language): boolean {
    return this.translateService.hasTranslationKey(this.toScopedKey(key), lang);
  }

  getParent(): ITranslateService | null {
    return this.translateService.getParent();
  }

  getRoot(): ITranslateService {
    return this.translateService.getRoot();
  }
}
