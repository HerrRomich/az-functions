import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { RouterSupportService } from '../../services';
import { BreadcrumbComponent } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let mockRouterSupportService: MockProxy<RouterSupportService>;

  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  beforeEach(async () => {
    mockRouterSupportService = mock<RouterSupportService>();
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [{ provide: RouterSupportService, useValue: mockRouterSupportService }],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
