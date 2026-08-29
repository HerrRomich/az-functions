import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormControlDirective, FormControlName, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { mock } from 'jest-mock-extended';
import { ReplaySubject } from 'rxjs';
import { ErrorRootDirective } from './error-root.directive';

@Component({
  template: `
    <mat-form-field>
      <input matInput [formControl]="formGroup.controls.formControl" />
      <mat-error *fsFirstError="let error">{{ error }}</mat-error>
    </mat-form-field>
  `,
  imports: [ReactiveFormsModule, MatFormFieldModule, ErrorRootDirective],
})
class HostWithFormControl {
  private readonly formBuilder = inject(FormBuilder);
  readonly formGroup = this.formBuilder.group({
    formControl: [''],
  });
}

@Component({
  template: `
    <form [formGroup]="formGroup">
      <mat-form-field>
        <input matInput formControlName="formControl" />
        <mat-error *fsFirstError="let error">{{ error }}</mat-error>
      </mat-form-field>
    </form>
  `,
  imports: [ReactiveFormsModule, MatFormFieldModule, ErrorRootDirective],
})
class HostWithFormControlName {
  private readonly formBuilder = inject(FormBuilder);
  readonly formGroup = this.formBuilder.group({
    formControl: [''],
  });
}

describe('ErrorRootDirective', () => {
  let subject: ErrorRootDirective;
  let formControlReplyStream: ReplaySubject<FormControl | undefined>;

  beforeEach(() => {
    subject = new ErrorRootDirective();
    formControlReplyStream = new ReplaySubject(10);
  });

  it('should provide undefined if no form control set.', () => {
    const expectedReplyStream$ = hot('a', { a: undefined });
    const expectedCurrentStream$ = hot('a', { a: undefined });

    expect(formControlReplyStream).toBeObservable(expectedReplyStream$);
    expect(subject.formControl$).toBeObservable(expectedCurrentStream$);
  });

  it('should provide form control if form control set.', () => {
    const mockFormControl = new FormControl('');
    const mockFormControlName = mock<FormControlName>({
      control: undefined,
    });
    (mockFormControlName as { control: FormControl }).control = mockFormControl;
    subject.formControlName = mockFormControlName;

    const expectedReplyStream$ = hot('(ab)', { a: undefined, b: mockFormControl });
    const expectedCurrentStream$ = hot('a', { a: mockFormControl });

    expect(formControlReplyStream).toBeObservable(expectedReplyStream$);
    expect(subject.formControl$).toBeObservable(expectedCurrentStream$);
  });

  it('should provide form control if form control name set.', () => {
    const mockFormControl = new FormControl('');
    const mockFormControlDirective = {} as FormControlDirective;
    Object.defineProperty(mockFormControlDirective, 'control', { get: () => mockFormControl });
    subject.formControlDirective = mockFormControlDirective;

    const expectedReplyStream$ = hot('(ab)', { a: undefined, b: mockFormControl });
    const expectedCurrentStream$ = hot('a', { a: mockFormControl });

    expect(formControlReplyStream).toBeObservable(expectedReplyStream$);
    expect(subject.formControl$).toBeObservable(expectedCurrentStream$);
  });

  it('should provide last set form control.', () => {
    const mockFormControl1 = new FormControl('');
    const mockFormControlName = mock<FormControlName>({
      control: undefined,
    });
    (mockFormControlName as { control: FormControl }).control = mockFormControl1;
    subject.formControlName = mockFormControlName;

    const mockFormControl2 = new FormControl('');
    const mockFormControlDirective = {} as FormControlDirective;
    Object.defineProperty(mockFormControlDirective, 'control', { get: () => mockFormControl2 });
    subject.formControlDirective = mockFormControlDirective;

    const expectedReplyStream$ = hot('(abc)', { a: undefined, b: mockFormControl1, c: mockFormControl2 });
    const expectedCurrentStream$ = hot('a', { a: mockFormControl2 });

    expect(formControlReplyStream).toBeObservable(expectedReplyStream$);
    expect(subject.formControl$).toBeObservable(expectedCurrentStream$);
  });
});
