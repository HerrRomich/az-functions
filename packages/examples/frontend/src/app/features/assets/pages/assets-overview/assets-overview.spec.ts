import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsOverview } from './assets-overview';

describe('AssetsOverview', () => {
  let component: AssetsOverview;
  let fixture: ComponentFixture<AssetsOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
