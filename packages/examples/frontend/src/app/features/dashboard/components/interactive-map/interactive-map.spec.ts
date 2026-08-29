import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveMap } from './interactive-map';

describe('InteractiveMap', () => {
  let component: InteractiveMap;
  let fixture: ComponentFixture<InteractiveMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveMap],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
