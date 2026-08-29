import { ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { mock, MockProxy } from 'jest-mock-extended';
import { OptTranslatePipe } from './opt-translate.pipe';

describe('OptionalTranslatePipe', () => {
  let mockTranslate: MockProxy<TranslateService>;
  let mockDetectorRef: MockProxy<ChangeDetectorRef>;

  let subject: OptTranslatePipe;

  beforeEach(() => {
    mockTranslate = mock();
    mockDetectorRef = mock();
    subject = new OptTranslatePipe(mockTranslate, mockDetectorRef);
  });

  it('create an instance', () => {
    expect(subject).toBeTruthy();
  });

  it('g', () => {
    subject.transform();
  });
});
