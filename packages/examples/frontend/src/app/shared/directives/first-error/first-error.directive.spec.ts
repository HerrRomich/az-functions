import { EmbeddedViewRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { FormControl, FormControlStatus } from '@angular/forms';
import { DeepMockProxy, MockProxy, mock, mockDeep } from 'jest-mock-extended';
import { EMPTY, Subject } from 'rxjs';
import { ErrorRootDirective } from './error-root.directive';
import { ErrorContext, FirstErrorDirective } from './first-error.directive';

describe('ErrorDirective', () => {
  let subject: FirstErrorDirective;
  let mockErroRoot: MockProxy<ErrorRootDirective>;
  let mockTemplateRef: MockProxy<TemplateRef<ErrorContext>>;
  let mockViewContainerRef: MockProxy<ViewContainerRef>;
  let mockedView: MockProxy<EmbeddedViewRef<never>>;
  let mockedViewInstance: EmbeddedViewRef<never>;

  beforeEach(() => {
    mockErroRoot = mock();
    mockTemplateRef = mock();
    mockErroRoot = mock();
    mockViewContainerRef = mock();
    mockedView = mock();
    //mockViewContainerRef.createEmbeddedView.mockre(templateRefInstance, anything())).thenReturn(mockedViewInstance);
  });

  describe('test without root control', () => {
    let mockTemplateRef: MockProxy<TemplateRef<never>>;
    beforeEach(() => {
      mockTemplateRef = mock();
      mockErroRoot.formControl$ = EMPTY;
      subject = new FirstErrorDirective(mockErroRoot, mockTemplateRef, mockViewContainerRef);
    });

    it('should not show the embedded view', () => {
      expect(mockViewContainerRef.createEmbeddedView).not.toHaveBeenCalled();
    });
  });

  describe('test with root control', () => {
    let mockRootControl: DeepMockProxy<FormControl>;
    let mockStatusChanges$: Subject<FormControlStatus>;
    beforeEach(() => {
      mockStatusChanges$ = new Subject();
      mockRootControl = mockDeep<FormControl>({
        statusChanges: mockStatusChanges$,
        errors: null,
      });

      mockErroRoot.formControl.mockReturnValue(mockRootControl);
      subject = new FirstErrorDirective(mockErroRoot, mockTemplateRef, mockViewContainerRef);
    });

    it('should not show the embedded view if no initial error', () => {
      mockStatusChanges$.next('VALID');
      expect(mockViewContainerRef.createEmbeddedView).toHaveBeenCalled();
    });

    /*describe('test with filterErrorKey set', () => {
      beforeEach(() => {
        subject.pacErrorFilterErrorKey = 'test-error-key';
      });

      it('should return the set pacErrorFilterErrorKey', () => {
        expect(subject.pacErrorFilterErrorKey).toBe('test-error-key');
      });

      it('should not show the embedded view if there is no filtered errors', async () => {
        mockRootControl.errors).thenReturn({
          'unfiltered-error-key- 1': 'unfiltered-error-value-1',
          'unfiltered-error-key- 2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('VALID');
        expect(mockViewContainerRef.createEmbeddedView).not.toHaveBeenCalled();
        expect(mockedView.destroy).not.toHaveBeenCalled();
      });

      it('should show the embedded view with filtered error', () => {
        mockRootControl.errors = .thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'test-error-key': 'test-error-value',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        expect(
          mockViewContainerRef.createEmbeddedView).toHaveBeenCalledWith(
            mockTemplateRef,
            {
              $implicit: {
                key: 'test-error-key',
                value: 'test-error-value',
              },
            },
        );
        expect(mockedView.destroy).not.toHaveBeenCalled();
      });

      it('should show the embedded view with filtered error and hide it after the filtered error is gone', () => {
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'test-error-key': 'test-error-value',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        verify(
          mockViewContainerRef.createEmbeddedView(
            templateRefInstance,
            deepEqual({
              $implicit: {
                key: 'test-error-key',
                value: 'test-error-value',
              },
            }),
          ),
        ).once();
        verify(mockedView.destroy()).once();
      });
    });

    describe('test without filterErrorKey set', () => {
      it('should return the set pacErrorFilterErrorKey', () => {
        expect(subject.pacErrorFilterErrorKey).toBeUndefined();
      });

      it('should show the embedded view with first key', async () => {
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        verify(
          mockViewContainerRef.createEmbeddedView(
            templateRefInstance,
            deepEqual({
              $implicit: {
                key: 'unfiltered-error-key-1',
                value: 'unfiltered-error-value-1',
              },
            }),
          ),
        ).once();
        verify(mockedView.destroy()).never();
      });

      it('should show the embedded view with first key and then with another first key', async () => {
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        verify(
          mockViewContainerRef.createEmbeddedView(
            templateRefInstance,
            deepEqual({
              $implicit: {
                key: 'unfiltered-error-key-1',
                value: 'unfiltered-error-value-1',
              },
            }),
          ),
        ).once();
        expect(mockedViewInstance.InvocationCtx).toStrictEqual({
          $implicit: {
            key: 'unfiltered-error-key-2',
            value: 'unfiltered-error-value-2',
          },
        });
        verify(mockedView.markForCheck()).once();
        verify(mockedView.destroy()).never();
      });

      it('should show the embedded view with first error and hide it after all errors gone', () => {
        when(mockRootControl.errors).thenReturn({
          'unfiltered-error-key-1': 'unfiltered-error-value-1',
          'unfiltered-error-key-2': 'unfiltered-error-value-2',
        });
        mockStatusChanges$.next('INVALID');
        when(mockRootControl.errors).thenReturn(null);
        mockStatusChanges$.next('VALID');
        verify(
          mockViewContainerRef.createEmbeddedView(
            templateRefInstance,
            deepEqual({
              $implicit: {
                key: 'unfiltered-error-key-1',
                value: 'unfiltered-error-value-1',
              },
            }),
          ),
        ).once();
        verify(mockedView.destroy()).once();
      });
    });*/
  });
});
