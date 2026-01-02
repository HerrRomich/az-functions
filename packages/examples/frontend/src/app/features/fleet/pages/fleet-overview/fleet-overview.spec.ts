import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleetOverview } from './fleet-overview';

describe('FleetOverview', () => {
  let component: FleetOverview;
  let fixture: ComponentFixture<FleetOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FleetOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
