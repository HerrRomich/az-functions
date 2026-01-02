import { ElementRef, Renderer2 } from '@angular/core';
import { DeepMockProxy, MockProxy, mock, mockDeep } from 'jest-mock-extended';
import { EllipsisWithTooltipDirective } from './ellipsis-with-tooltip.directive';

describe('EllipsisWithTooltipDirective', () => {
  let subject: EllipsisWithTooltipDirective;
  let mockTargetElement: HTMLElement;
  let mockRenderer: MockProxy<Renderer2>;
  let mockDocument: MockProxy<Document>;
  let mockBody: MockProxy<HTMLBodyElement>;
  let mockTooltip: DeepMockProxy<HTMLElement>;

  beforeEach(() => {
    mockTargetElement = document.createElement('div');
    mockTooltip = mockDeep<HTMLElement>({
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
    mockDocument = mock();
    mockBody = mock<HTMLBodyElement>();
    mockDocument.querySelector.calledWith('body').mockReturnValue(mockBody);

    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'rgb(255,255,255)',
    } as any);
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, 'pageXOffset', { writable: true, configurable: true, value: 0 });
    Object.defineProperty(window, 'pageYOffset', { writable: true, configurable: true, value: 0 });

    subject = new EllipsisWithTooltipDirective(new ElementRef(mockTargetElement), mockRenderer, mockDocument);
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
      expect(mockRenderer.appendChild).toHaveBeenCalledWith(mockBody, mockTooltip);
      expect(mockRenderer.removeChild).toHaveBeenCalledWith(mockBody, mockTooltip);
      expect(mockTooltip.style.opacity).not.toBe('1');
    });

    it('should show tooltip if text is overflowing', () => {
      subject.onMouseOver();

      expect(mockRenderer.appendChild).toHaveBeenCalledWith(mockBody, mockTooltip);
      expect(mockRenderer.removeChild).not.toHaveBeenCalled();
      expect(mockTooltip.style.opacity).toBe('1');
    });

    it('should set tooltip position to target element position', () => {
      subject.onMouseOver();

      expect(mockTooltip.style.left).toBe('100px');
      expect(mockTooltip.style.top).toBe('50px');
    });

    it('should set tooltip position correctly with page scroll', () => {
      Object.defineProperty(window, 'pageXOffset', { value: 10 });
      Object.defineProperty(window, 'pageYOffset', { value: 20 });
      subject.onMouseOver();

      expect(mockTooltip.style.left).toBe('110px');
      expect(mockTooltip.style.top).toBe('70px');
    });

    it('should set tooltip width to its own width if enough space is available', () => {
      subject.onMouseOver();

      expect(mockTooltip.style.width).toBe('200px');
    });

    it('should limit tooltip width if not enough space is available', () => {
      mockTooltip.getBoundingClientRect.mockReturnValue({ width: 800, height: 20 } as DOMRect);
      subject.onMouseOver();

      expect(mockTooltip.style.width).toBe('680px');
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
      expect(mockRenderer.removeChild).toHaveBeenCalledWith(mockBody, mockTooltip);
    });
  });

  describe('onMouseOut', () => {
    it('should remove tooltip', () => {
      subject.onMouseOver();

      subject.onMouseOut();

      expect(mockRenderer.removeChild).toHaveBeenCalledWith(mockBody, mockTooltip);
    });
  });
  describe('getBackgroundColor', () => {
    it('should return default color if target is null', () => {
      expect((subject as any).getBackgroundColor(null)).toBe('#FFFFFFFF');
    });

    it('should return parent background color if transparent', () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);

      jest.spyOn(window, 'getComputedStyle').mockImplementation((el: any) => {
        if (el === child) {
          return { backgroundColor: 'rgba(0, 0, 0, 0)' } as any;
        }
        if (el === parent) {
          return { backgroundColor: 'rgb(1,2,3)' } as any;
        }
        return { backgroundColor: 'rgb(255,255,255)' } as any;
      });

      expect((subject as any).getBackgroundColor(child)).toBe('rgb(1,2,3)');
    });

    it('should return own background color if not transparent', () => {
      const el = document.createElement('div');
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        backgroundColor: 'rgb(4,5,6)',
      } as any);
      expect((subject as any).getBackgroundColor(el)).toBe('rgb(4,5,6)');
    });
  });
});
