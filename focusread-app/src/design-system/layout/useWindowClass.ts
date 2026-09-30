import { useWindowDimensions } from 'react-native';

import { getWindowClass, layout, type WindowClass } from '../tokens';

export interface WindowInfo {
  width: number;
  height: number;
  windowClass: WindowClass;
  isLandscape: boolean;
  gutter: number;
  libraryColumns: number;
}

// Reactivo a rotación, plegables y multiventana. Se basa en useWindowDimensions, nunca en lectura estática.
export function useWindowClass(): WindowInfo {
  const { width, height } = useWindowDimensions();
  const windowClass = getWindowClass(width);
  return {
    width,
    height,
    windowClass,
    isLandscape: width > height,
    gutter: layout.gutter[windowClass],
    libraryColumns: layout.libraryColumns[windowClass],
  };
}
