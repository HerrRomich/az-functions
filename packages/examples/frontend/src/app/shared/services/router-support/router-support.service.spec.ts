import { TestBed } from '@angular/core/testing';

import { RouterSupportService } from '@fleet/shared/services';

describe('LoadingService', () => {
  let service: RouterSupportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouterSupportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
