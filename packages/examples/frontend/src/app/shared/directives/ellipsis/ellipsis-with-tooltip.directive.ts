import { Directive, ElementRef, HostListener, inject, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[fsEllipsis]',
})
export class EllipsisWithTooltipDirective implements OnDestroy {
  el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  private readonly textOverflow: string;
  private readonly whiteSpace: string;
  private readonly overflow: string;
  private tooltip: HTMLElement | undefined;
  private readonly body: HTMLBodyElement;
  private readonly target: HTMLElement;

  constructor() {
    this.target = this.el.nativeElement;
    this.textOverflow = this.target.style.textOverflow;
    this.whiteSpace = this.target.style.whiteSpace;
    this.overflow = this.target.style.overflow;
    this.target.style.textOverflow = 'ellipsis';
    this.target.style.whiteSpace = 'nowrap';
    this.target.style.overflow = 'hidden';
    this.body = document.querySelector('body')!;
  }

  ngOnDestroy(): void {
    this.removeTooltip();
  }

  @HostListener('mouseover')
  onMouseOver() {
    const tooltip: HTMLElement = this.target.cloneNode(true) as HTMLElement;
    tooltip.style.textOverflow = this.textOverflow;
    tooltip.style.whiteSpace = this.whiteSpace;
    tooltip.style.overflow = this.overflow;
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '0';
    tooltip.style.width = 'auto';
    const targetRect = this.target.getBoundingClientRect();
    tooltip.style.opacity = '0';
    const compiledStyle = window.getComputedStyle(this.target);
    tooltip.style.font = compiledStyle.font;
    tooltip.style.fontStyle = compiledStyle.fontStyle;
    tooltip.style.fontFamily = compiledStyle.fontFamily;
    tooltip.style.fontSize = compiledStyle.fontSize;
    tooltip.style.fontWeight = compiledStyle.fontWeight;
    tooltip.style.letterSpacing = compiledStyle.letterSpacing;
    tooltip.style.lineHeight = compiledStyle.lineHeight;
    tooltip.style.textDecoration = compiledStyle.textDecoration;
    this.renderer.appendChild(this.body, tooltip);
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const leftRelativeToDocument = targetRect.left + scrollLeft;
    const topRelativeToDocument = targetRect.top + scrollTop;
    tooltip.style.left = `${leftRelativeToDocument}px`;
    tooltip.style.top = `${topRelativeToDocument}px`;
    if (tooltipRect.width > targetRect.width) {
      tooltip.style.transition = 'opacity 150ms linear 100ms';
      tooltip.style.margin = '-2px';
      tooltip.style.padding = '1px';
      tooltip.style.borderStyle = 'solid';
      tooltip.style.color = compiledStyle.color;
      tooltip.style.borderColor = compiledStyle.color;
      tooltip.style.borderWidth = '1px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.backgroundColor = this.getBackgroundColor(this.target);
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '100000000';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.overflow = 'hidden';
      tooltip.style.width = `${Math.min(tooltipRect.width, window.innerWidth - leftRelativeToDocument - 20)}px`;

      this.tooltip = tooltip;
      tooltip.style.opacity = '1';
    } else {
      this.renderer.removeChild(this.body, tooltip);
    }
  }

  private getBackgroundColor(target: HTMLElement | null): string {
    if (!target) {
      return '#FFFFFFFF';
    }
    const compiledStyle = window.getComputedStyle(target);
    if (compiledStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
      return this.getBackgroundColor(target.parentElement);
    }
    return compiledStyle.backgroundColor;
  }

  @HostListener('mouseout')
  onMouseOut() {
    this.removeTooltip();
  }

  private removeTooltip() {
    if (this.tooltip) {
      this.renderer.removeChild(this.body, this.tooltip);
      this.tooltip = undefined;
    }
  }
}
