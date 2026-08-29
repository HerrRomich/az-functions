import { TestBed } from '@angular/core/testing';

import { ScopedMissingTranslationHandler } from './scoped-missing-translation-handler';

describe('ScopedMissingTranslationHandler', () => {
  let service: ScopedMissingTranslationHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScopedMissingTranslationHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
