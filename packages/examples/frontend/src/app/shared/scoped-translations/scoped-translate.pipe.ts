import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScopedTranslateService } from './scoped-translate.service';

@Pipe({
  name: 'scopedTranslate',
  pure: false,
})
export class ScopedTranslatePipe extends TranslatePipe implements PipeTransform {
  constructor() {
    super();
    const translateService = inject(ScopedTranslateService);
    Reflect.set(this, 'translate', translateService);
  }
}
