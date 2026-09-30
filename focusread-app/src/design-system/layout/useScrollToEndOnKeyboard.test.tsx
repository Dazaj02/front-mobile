import { Keyboard, type ScrollView } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useScrollToEndOnKeyboard } from './useScrollToEndOnKeyboard';

describe('useScrollToEndOnKeyboard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('al abrirse el teclado desplaza el contenido al final (el botón de enviar queda visible)', async () => {
    let onShow: (() => void) | undefined;
    const remove = jest.fn();
    const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      if (event === 'keyboardDidShow') onShow = cb;
      return { remove };
    }) as never);
    const scrollToEnd = jest.fn();
    const ref = { current: { scrollToEnd } as unknown as ScrollView };

    const { unmount } = await renderHook(() => useScrollToEndOnKeyboard(ref));
    expect(add).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(scrollToEnd).not.toHaveBeenCalled();

    onShow?.();
    jest.advanceTimersByTime(100);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
