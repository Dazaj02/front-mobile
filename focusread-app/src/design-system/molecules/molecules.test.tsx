import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../theme/ThemeProvider';
import { renderWithTheme } from '../testUtils';
import {
  Banner,
  DoseChecklistItem,
  FilterChipGroup,
  FontSizeStepper,
  FormField,
  PasswordField,
  SearchBar,
  SectionHeader,
  SettingRow,
  StatTile,
  ThemeSwatch,
  VoiceOption,
} from '.';

describe('moléculas: render y accesibilidad', () => {
  it('FormField asocia etiqueta, ayuda y error', async () => {
    await renderWithTheme(<FormField label="Correo" helpText="Tu correo" errorText="Correo inválido" value="" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Correo')).toBeTruthy();
    expect(screen.getByText('Correo inválido')).toBeTruthy();
    expect(screen.queryByText('Tu correo')).toBeNull();
  });

  it('PasswordField alterna mostrar/ocultar', async () => {
    await renderWithTheme(<PasswordField label="Contraseña" value="abc12345" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeTruthy();
  });

  it('SearchBar borra el texto', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(<SearchBar value="hola" onChangeText={onChangeText} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('FilterChipGroup marca la opción activa y notifica cambios', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <FilterChipGroup
        options={[
          { id: 'a', label: 'Todos' },
          { id: 'b', label: 'Guardados' },
        ]}
        value="a"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Todos' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Guardados' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('SettingRow navegable expone rol button con título y descripción', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<SettingRow title="Motor de IA" description="FocusRead" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Motor de IA. FocusRead' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('SectionHeader usa rol header y acción opcional', async () => {
    const onAction = jest.fn();
    await renderWithTheme(<SectionHeader title="Recientes" actionLabel="Ver todo" onAction={onAction} />);
    expect(screen.getByRole('header', { name: 'Recientes' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todo' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('StatTile se lee como una sola frase', async () => {
    await renderWithTheme(<StatTile label="Racha" value="5 días" hint="Mejor: 9" />);
    expect(screen.getByLabelText('Racha: 5 días. Mejor: 9')).toBeTruthy();
  });

  it('ThemeSwatch es un radio con estado checked', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<ThemeSwatch mode="sepia" label="Sepia" selected onPress={onPress} />);
    const radio = screen.getByRole('radio', { name: 'Sepia' });
    expect(radio.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(radio);
    expect(onPress).toHaveBeenCalled();
  });

  it('VoiceOption permite elegir y probar la voz', async () => {
    const onSelect = jest.fn();
    const onPreview = jest.fn();
    await renderWithTheme(<VoiceOption name="Voz A" language="es-MX" selected={false} onSelect={onSelect} onPreview={onPreview} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Voz A, es-MX' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Probar voz Voz A' }));
    expect(onSelect).toHaveBeenCalled();
    expect(onPreview).toHaveBeenCalled();
  });

  it('FontSizeStepper cambia de a 0.1 y bloquea en los límites', async () => {
    const onChange = jest.fn();
    const { rerender } = await renderWithTheme(<FontSizeStepper value={1} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar tamaño de letra' }));
    expect(onChange).toHaveBeenCalledWith(1.1);
    await rerender(
      <ThemeProvider>
        <FontSizeStepper value={1.6} onChange={onChange} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Aumentar tamaño de letra' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('DoseChecklistItem describe posición, duración y estado', async () => {
    await renderWithTheme(<DoseChecklistItem index={1} title="Desarrollo" minutes={2.5} done={false} current />);
    expect(screen.getByLabelText('Dosis 2: Desarrollo, 2.5 minutos, en curso')).toBeTruthy();
  });

  it('Banner de error es un alert con acción', async () => {
    const onAction = jest.fn();
    await renderWithTheme(<Banner tone="error" message="Falló" actionLabel="Reintentar" onAction={onAction} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onAction).toHaveBeenCalled();
  });
});
