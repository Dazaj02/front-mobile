import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { flattenStyle, renderWithTheme } from '../testUtils';
import { AppText, Badge, Button, Chip, Divider, Icon, IconButton, ProgressBar, Spinner, Switch, TextInputBase } from '.';

describe('átomos: render y accesibilidad', () => {
  it('AppText muestra su contenido', async () => {
    await renderWithTheme(<AppText variant="title">Hola</AppText>);
    expect(screen.getByText('Hola')).toBeTruthy();
  });

  it('Icon es decorativo (oculto a TalkBack)', async () => {
    const { toJSON } = await renderWithTheme(<Icon name="add" />);
    expect(JSON.stringify(toJSON())).toContain('"importantForAccessibility":"no"');
  });

  describe('Button', () => {
    it('tiene rol button, etiqueta y responde al toque', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Guardar" onPress={onPress} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('deshabilitado no dispara y expone el estado', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Guardar" disabled onPress={onPress} />);
      const btn = screen.getByRole('button', { name: 'Guardar' });
      expect(btn.props.accessibilityState).toMatchObject({ disabled: true });
      await fireEvent.press(btn);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('cargando queda ocupado y no dispara', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Enviar" loading onPress={onPress} />);
      const btn = screen.getByRole('button', { name: 'Enviar' });
      expect(btn.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
      await fireEvent.press(btn);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  it('IconButton expone su etiqueta y mide 48 dp', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<IconButton icon="close" accessibilityLabel="Cerrar" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Cerrar' });
    const style = Array.isArray(btn.props.style) ? Object.assign({}, ...btn.props.style) : btn.props.style;
    expect(style).toMatchObject({ width: 48, height: 48 });
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });

  it('Chip refleja selected en accessibilityState', async () => {
    await renderWithTheme(<Chip label="Todos" selected onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Todos' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('Badge es accesible con su etiqueta', async () => {
    await renderWithTheme(<Badge label="Nuevo" tone="accent" />);
    expect(screen.getByLabelText('Nuevo')).toBeTruthy();
  });

  it('Switch tiene rol switch, etiqueta y estado checked', async () => {
    const onValueChange = jest.fn();
    await renderWithTheme(<Switch value accessibilityLabel="Vibración" onValueChange={onValueChange} />);
    const sw = screen.getByRole('switch', { name: 'Vibración' });
    expect(sw.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('ProgressBar expone valor 0–100 y limita fuera de rango', async () => {
    await renderWithTheme(<ProgressBar value={1.7} accessibilityLabel="Avance" />);
    const bar = screen.getByRole('progressbar', { name: 'Avance' });
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 100 });
  });

  it('TextInputBase respeta disabled y etiqueta', async () => {
    await renderWithTheme(<TextInputBase accessibilityLabel="Correo" disabled />);
    const input = screen.getByLabelText('Correo');
    expect(input.props.editable).toBe(false);
  });

  it('Spinner tiene etiqueta accesible', async () => {
    await renderWithTheme(<Spinner accessibilityLabel="Cargando artículo" />);
    expect(screen.getByLabelText('Cargando artículo')).toBeTruthy();
  });

  it('Divider se oculta a TalkBack', async () => {
    const { toJSON } = await renderWithTheme(<Divider />);
    expect(JSON.stringify(toJSON())).toContain('"importantForAccessibility":"no"');
  });
});
