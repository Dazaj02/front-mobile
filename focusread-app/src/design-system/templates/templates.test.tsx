import React from 'react';
import { fireEvent, renderHook, screen } from '@testing-library/react-native';

import { useWindowClass } from '../layout/useWindowClass';
import { AppText } from '../atoms/AppText';
import { flattenStyle, renderWithTheme, TestProviders } from '../testUtils';
import { breakpoints, getWindowClass, layout } from '../tokens';
import { AuthTemplate, ReaderTemplate, ScreenTemplate, SheetTemplate } from '.';

describe('clases de ventana', () => {
  it('respeta los límites 600 y 840 dp', () => {
    expect(getWindowClass(359)).toBe('compact');
    expect(getWindowClass(breakpoints.medium - 1)).toBe('compact');
    expect(getWindowClass(breakpoints.medium)).toBe('medium');
    expect(getWindowClass(breakpoints.expanded - 1)).toBe('medium');
    expect(getWindowClass(breakpoints.expanded)).toBe('expanded');
  });

  it('useWindowClass expone gutter y columnas coherentes con la clase', async () => {
    const { result } = await renderHook(() => useWindowClass());
    const w = result.current;
    expect(w.windowClass).toBe(getWindowClass(w.width));
    expect(w.gutter).toBe(layout.gutter[w.windowClass]);
    expect(w.libraryColumns).toBe(layout.libraryColumns[w.windowClass]);
  });
});

describe('templates', () => {
  it('ScreenTemplate limita el contenido a 840 dp y muestra encabezado y banner', async () => {
    await renderWithTheme(
      <ScreenTemplate header={{ title: 'Biblioteca' }} banner={<AppText>Sin conexión</AppText>}>
        <AppText>Contenido</AppText>
      </ScreenTemplate>,
    );
    expect(flattenStyle(screen.getByTestId('screen-column').props.style).maxWidth).toBe(layout.contentMaxWidth);
    expect(screen.getByRole('header', { name: 'Biblioteca' })).toBeTruthy();
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('ReaderTemplate no supera 640 dp de columna', async () => {
    await renderWithTheme(
      <ReaderTemplate top={<AppText>Arriba</AppText>} bottom={<AppText>Abajo</AppText>}>
        <AppText>Texto</AppText>
      </ReaderTemplate>,
    );
    expect(flattenStyle(screen.getByTestId('reader-column').props.style).maxWidth).toBe(layout.readerMaxWidth);
    expect(screen.getByText('Arriba')).toBeTruthy();
    expect(screen.getByText('Abajo')).toBeTruthy();
  });

  it('AuthTemplate limita el ancho a 480 dp', async () => {
    await renderWithTheme(
      <AuthTemplate>
        <AppText>Formulario</AppText>
      </AuthTemplate>,
    );
    expect(flattenStyle(screen.getByTestId('auth-column').props.style).maxWidth).toBe(layout.authMaxWidth);
  });

  it('SheetTemplate se muestra, cierra con el scrim y con el botón atrás (onRequestClose)', async () => {
    const onClose = jest.fn();
    const { rerender } = await renderWithTheme(
      <SheetTemplate visible title="Importar" onClose={onClose}>
        <AppText>Cuerpo</AppText>
      </SheetTemplate>,
    );
    expect(screen.getByRole('header', { name: 'Importar' })).toBeTruthy();
    expect(screen.getByText('Cuerpo')).toBeTruthy();
    // El scrim queda oculto a TalkBack (accessibilityViewIsModal) pero sigue siendo tocable.
    expect(screen.queryByRole('button', { name: 'Cerrar hoja' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar hoja', hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await rerender(
      <TestProviders>
        <SheetTemplate visible={false} title="Importar" onClose={onClose}>
          <AppText>Cuerpo</AppText>
        </SheetTemplate>
      </TestProviders>,
    );
    expect(screen.queryByText('Cuerpo')).toBeNull();
  });
});
