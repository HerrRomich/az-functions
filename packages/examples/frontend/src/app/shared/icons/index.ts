import { inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

const ICONS = [
  'arrow-bottom-right-thin-circle-outline',
  'arrow-right-thin-circle-outline',
  'arrow-top-right-thin-circle-outline',
  'download-circle-outline',
  'sleep',
  'upload-circle-outline',
  'wrench-clock',
  'target',
  'close',
] as const;

export function registerIcons() {
  const iconRegistry = inject(MatIconRegistry);
  const sanitizer = inject(DomSanitizer);
  ICONS.forEach(iconName => {
    // eslint-disable-next-line sonarjs/no-angular-bypass-sanitization
    iconRegistry.addSvgIcon(iconName, sanitizer.bypassSecurityTrustResourceUrl(`icons/${iconName}.svg`));
  });
}
