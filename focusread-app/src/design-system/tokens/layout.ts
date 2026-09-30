export type WindowClass = 'compact' | 'medium' | 'expanded';

export const breakpoints = { medium: 600, expanded: 840 } as const;

export function getWindowClass(widthDp: number): WindowClass {
  if (widthDp >= breakpoints.expanded) return 'expanded';
  if (widthDp >= breakpoints.medium) return 'medium';
  return 'compact';
}

export const layout = {
  gutter: { compact: 16, medium: 24, expanded: 32 },
  readerMaxWidth: 640,
  contentMaxWidth: 840,
  authMaxWidth: 480,
  libraryColumns: { compact: 1, medium: 2, expanded: 2 },
  zIndex: { base: 0, dock: 10, sheet: 20, toast: 30 },
} as const;
