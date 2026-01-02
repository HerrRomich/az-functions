import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Truck } from './truck';

describe('Truck', () => {
  let component: Truck;
  let fixture: ComponentFixture<Truck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Truck]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Truck);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
