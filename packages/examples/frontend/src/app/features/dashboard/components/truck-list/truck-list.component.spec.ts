import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TruckList } from './truck-list.component';

describe('TruckList', () => {
  let component: TruckList;
  let fixture: ComponentFixture<TruckList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruckList],
    }).compileComponents();

    fixture = TestBed.createComponent(TruckList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
