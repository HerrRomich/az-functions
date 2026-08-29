import { ElementRef, Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockProxy, mock, mockDeep } from 'jest-mock-extended';
import { EllipsisWithTooltipDirective } from './ellipsis-with-tooltip.directive';

describe('EllipsisWithTooltipDirective', () => {
  let subject: EllipsisWithTooltipDirective;
  let mockTargetElement: HTMLElement;
  let mockRenderer: MockProxy<Renderer2>;
  let mockTooltip: MockProxy<HTMLElement>;

  beforeEach(() => {
    mockTargetElement = document.createElement('div');
    mockTooltip = mock<HTMLElement>({
      style: {
        left: '0',
        top: '0',
      },
    });
    mockTooltip.getBoundingClientRect.mockReturnValue({ width: 200, height: 20 } as DOMRect);
    jest.spyOn(mockTargetElement, 'cloneNode').mockReturnValue(mockTooltip);
    jest.spyOn(mockTargetElement, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 100,
      height: 20,
    } as DOMRect);
    mockRenderer = mockDeep();

    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'rgb(255,255,255)',
    } as CSSStyleDeclaration);
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, 'pageXOffset', { writable: true, configurable: true, value: 0 });
    Object.defineProperty(window, 'pageYOffset', { writable: true, configurable: true, value: 0 });

    TestBed.configureTestingModule({
      imports: [EllipsisWithTooltipDirective],
      providers: [
        { provide: Renderer2, useValue: mockRenderer },
        { provide: ElementRef, useValue: new ElementRef(mockTargetElement) },
      ],
    });

    subject = TestBed.runInInjectionContext(() => new EllipsisWithTooltipDirective());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an instance', () => {
    expect(subject).toBeTruthy();
  });

  describe('onMouseOver', () => {
    it('should not show tooltip if text is not overflowing', () => {
      mockTooltip.getBoundingClientRect.mockReturnValue({ width: 90, height: 20 } as DOMRect);

      subject.onMouseOver();

      expect(mockRenderer.appendChild).toHaveBeenCalledWith(document.body, mockTooltip);
      expect(mockRenderer.removeChild).toHaveBeenCalledWith(document.body, mockTooltip);
      expect(mockTooltip.style.opacity).not.toEqual('1');
    });

    it('should show tooltip if text is overflowing', () => {
      subject.onMouseOver();

      expect(mockRenderer.appendChild).toHaveBeenCalledWith(document.body, mockTooltip);
      expect(mockRenderer.removeChild).not.toHaveBeenCalled();
      expect(mockTooltip.style.opacity).toEqual('1');
    });

    it('should set tooltip position to target element position', () => {
      subject.onMouseOver();

      expect(mockTooltip.style.left).toEqual('100px');
      expect(mockTooltip.style.top).toEqual('50px');
    });

    it('should set tooltip position correctly with page scroll', () => {
      Object.defineProperty(window, 'pageXOffset', { value: 10 });
      Object.defineProperty(window, 'pageYOffset', { value: 20 });

      subject.onMouseOver();

      expect(mockTooltip.style.left).toBe('110px');
      expect(mockTooltip.style.top).toEqual('70px');
    });

    it('should set tooltip width to its own width if enough space is available', () => {
      subject.onMouseOver();

      expect(mockTooltip.style.width).toEqual('200px');
    });

    it('should limit tooltip width if not enough space is available', () => {
      mockTooltip.getBoundingClientRect.mockReturnValue({ width: 800, height: 20 } as DOMRect);

      subject.onMouseOver();

      expect(mockTooltip.style.width).toEqual('680px');
    });

    it('should return default color if target is null', () => {
      subject.onMouseOver();

      expect(mockTooltip.style.backgroundColor).toEqual('rgb(255,255,255)');
    });

    it('should return parent background color if transparent', () => {
      const parent = document.createElement('div');
      parent.appendChild(mockTargetElement);

      jest.spyOn(window, 'getComputedStyle').mockImplementation(el => {
        if (el === mockTargetElement) {
          return { backgroundColor: 'rgba(0, 0, 0, 0)' } as CSSStyleDeclaration;
        }
        if (el === parent) {
          return { backgroundColor: 'rgb(1,2,3)' } as CSSStyleDeclaration;
        }
        return { backgroundColor: 'rgb(255,255,255)' } as CSSStyleDeclaration;
      });

      subject.onMouseOver();

      expect(mockTooltip.style.backgroundColor).toEqual('rgb(1,2,3)');
    });

    it('should return own background color if not transparent', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        backgroundColor: 'rgb(4,5,6)',
      } as CSSStyleDeclaration);

      subject.onMouseOver();

      expect(mockTooltip.style.backgroundColor).toEqual('rgb(4,5,6)');
    });
  });

  describe('ngOnDestroy', () => {
    it('should do nothing if no tooltip exists', () => {
      subject.ngOnDestroy();
      expect(mockRenderer.removeChild).not.toHaveBeenCalled();
    });

    it('should remove tooltip if it exists', () => {
      subject.onMouseOver();
      subject.ngOnDestroy();
      expect(mockRenderer.removeChild).toHaveBeenCalledWith(document.body, mockTooltip);
    });
  });

  describe('onMouseOut', () => {
    it('should remove tooltip', () => {
      subject.onMouseOver();

      subject.onMouseOut();

      expect(mockRenderer.removeChild).toHaveBeenCalledWith(document.body, mockTooltip);
    });
  });
});
