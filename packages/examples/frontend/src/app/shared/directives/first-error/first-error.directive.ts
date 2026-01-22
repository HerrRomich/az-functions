import { KeyValue } from '@angular/common';
import { Directive, effect, EmbeddedViewRef, input, TemplateRef, untracked, ViewContainerRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { startWith, Subscription } from 'rxjs';
import { ErrorRootDirective } from './error-root.directive';

export interface ErrorContext {
  $implicit: KeyValue<string, unknown>;
}

type FilterErrorKey = string | string[] | undefined;

/**
 *  ErrorDirective is a structural directive, that can be applied
 *  to mat-error directive to extract a dedicated or just first error
 *  from formControl of any input element inside mat-form-field directive
 * it has an optional parameter {@link pacFirstErrorFilterErrorKey} that defines
 * an error key(s) on which this <mat-error> directive must be filtered and
 * defines order of preference.
 * If it is omitted, then the first occurred error wil be provided.
 *
 * as an output a key-value pair with error key and error data will be delivered:
 *
 * @example With filtering on single error key
 *     <mat-form-field appearance="fill">
 *       <mat-label>Name</mat-label>
 *       <input matInput formControlName="name"/>
 *       <mat-error *pacError="let error;filterErrorKey: 'required'">Value in field "Name" is required</mat-error>
 *     </mat-form-field>
 *
 * @example With filtering and ordering on error key
 *     <mat-form-field appearance="fill">
 *       <mat-label>Name</mat-label>
 *       <input matInput formControlName="name"/>
 *       <mat-error *pacError="let error;filterErrorKey: ['minlength', 'required']">Value in field "Name" is required</mat-error>
 *     </mat-form-field>
 *
 * @example With first error
 *     <mat-form-field appearance="fill">
 *       <mat-label>Name</mat-label>
 *       <input matInput formControlName="name"/>
 *       <mat-error *pacError="let error>
 *         {{ 'fields.name.errors.required.' + error.key | translate : error.value }}
 *       </mat-error>
 *     </mat-form-field>
 *
 * @class
 * @property {pacFirstErrorFilterErrorKey}
 */
@Directive({
  selector: '[fsFirstError]',
})
export class FirstErrorDirective {
  private view?: EmbeddedViewRef<ErrorContext>;

  fsFirstErrorFilterErrorKey = input<FilterErrorKey>();

  constructor(
    errorRoot: ErrorRootDirective,
    private readonly templateRef: TemplateRef<ErrorContext>,
    private readonly vcr: ViewContainerRef,
  ) {
    const subscription = new Subscription();
    effect(() => {
      subscription.unsubscribe();
      const filterErrorKey = this.fsFirstErrorFilterErrorKey();
      const formControl = errorRoot.formControl();

      untracked(() => {
        if (formControl === undefined) {
          this.updateView(undefined);
          return;
        }
        subscription.add(
          formControl.statusChanges.pipe(startWith(formControl.status)).subscribe(() => {
            const errorKeyValue = this.getError(filterErrorKey, formControl);
            this.updateView(errorKeyValue);
          }),
        );
      });
    });
  }

  private getError(filterErrorKey: FilterErrorKey, control: FormControl): KeyValue<string, unknown> | undefined {
    const errorKeys = typeof filterErrorKey === 'string' ? [filterErrorKey] : filterErrorKey;
    let errorKey: string | undefined = undefined;
    if (errorKeys === undefined) {
      const errorKeys = control.errors ? Object.keys(control.errors) : undefined;
      errorKey = errorKeys?.[0];
    } else if (control.errors !== null) {
      const errors = Object.keys(control.errors).filter(key => errorKeys?.includes(key));
      errors.sort((keyA, keyB) => {
        const posA = errorKeys.indexOf(keyA);
        const posB = errorKeys.indexOf(keyB);
        return posA - posB;
      });
      errorKey = errors[0];
    }
    if (errorKey) {
      return {
        key: errorKey,
        value: control.errors?.[errorKey],
      };
    } else {
      return undefined;
    }
  }

  private updateView(errorKeyValue: KeyValue<string, unknown> | undefined) {
    this.view?.destroy();
    this.view = undefined;
    if (errorKeyValue !== undefined) {
      this.view = this.vcr.createEmbeddedView(this.templateRef, { $implicit: errorKeyValue });
    }
  }

  static ngTemplateContextGuard(dir: FirstErrorDirective, ctx: any): ctx is ErrorContext {
    return true;
  }
}
