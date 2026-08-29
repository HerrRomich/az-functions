import { TestBed } from '@angular/core/testing';

import { FleetSightConfigService } from './fleet-sight-config.service';

describe('FleetSightConfigService', () => {
  let service: FleetSightConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FleetSightConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
