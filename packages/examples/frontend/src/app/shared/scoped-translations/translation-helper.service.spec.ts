import { TestBed } from '@angular/core/testing';

import { TranslationHelperService } from './translation-helper.service';

describe('TranslationHelperService', () => {
  let service: TranslationHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
