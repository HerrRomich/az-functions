import { computed, contentChild, Directive } from '@angular/core';
import { FormControlDirective, FormControlName } from '@angular/forms';

@Directive({
  /* eslint-disable-next-line @angular-eslint/directive-selector */
  selector: 'mat-form-field',
})
export class ErrorRootDirective {
  private formControlName = contentChild(FormControlName);
  private formControlDirective = contentChild(FormControlDirective);
  formControl = computed(() => this.formControlName()?.control ?? this.formControlDirective()?.control);
}
