import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TruckComponent } from './truck.component';

describe('Truck', () => {
  let component: TruckComponent;
  let fixture: ComponentFixture<TruckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruckComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TruckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
