import { Injectable } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams, StrictTranslation } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Injectable()
export class ScopedMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams): StrictTranslation | Observable<StrictTranslation> {
    if (params.key.startsWith('app.') || params.key.startsWith('shared.')) {
      return params.key;
    } else {
      console.warn(
        `Missing translation for key "${params.key}" in scope "${params.translateService.getCurrentLang()}"`,
      );
      return `[MISSING: ${params.key}]`;
    }
  }
}
