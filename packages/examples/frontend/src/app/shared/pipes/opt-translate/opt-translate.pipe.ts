import { Pipe, PipeTransform } from '@angular/core';
import { translationQuerySchema } from '@fleet/shared/model/opt-translation.model';
import { TranslatePipe } from '@ngx-translate/core';

@Pipe({
  standalone: true,
  name: 'optTranslate',
  pure: false,
})
export class OptTranslatePipe extends TranslatePipe implements PipeTransform {
  override transform(value: unknown): unknown {
    const parsedTranslation = translationQuerySchema.safeParse(value);
    if (parsedTranslation.success) {
      const transform = super.transform(parsedTranslation.data.key, parsedTranslation.data.params);
      return transform;
    } else {
      return value;
    }
  }
}
