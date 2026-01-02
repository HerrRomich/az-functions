import { TestBed } from '@angular/core/testing';

import { ScopedTranslateService } from './scoped-translate.service';

describe('ScopedTranslateService', () => {
  let service: ScopedTranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScopedTranslateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
