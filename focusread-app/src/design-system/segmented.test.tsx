import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { SegmentedProgress } from './atoms/SegmentedProgress';
import { SegmentedControl } from './molecules/SegmentedControl';
import { renderWithTheme } from './testUtils';

describe('SegmentedProgress (un segmento por dosis)', () => {
  const bar = () => screen.getByRole('progressbar', { name: 'Progreso del artículo' });
  const segments = () => bar().children.length;

  it('dibuja un segmento por dosis y expone el porcentaje total a TalkBack', async () => {
    await renderWithTheme(<SegmentedProgress total={4} completed={1} partial={0.5} accessibilityLabel="Progreso del artículo" />);
    expect(segments()).toBe(4);
    expect(bar().props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 38, text: '38 %' }); // (1 + 0.5) / 4
  });

  it('completo = 100 % y el avance parcial no cuenta cuando ya no quedan dosis', async () => {
    await renderWithTheme(<SegmentedProgress total={3} completed={3} partial={0.9} accessibilityLabel="Progreso del artículo" />);
    expect(bar().props.accessibilityValue.now).toBe(100);
  });

  it('valores fuera de rango o inválidos se acotan (nunca rompe)', async () => {
    await renderWithTheme(<SegmentedProgress total={0} completed={-5} partial={Number.NaN} accessibilityLabel="Progreso del artículo" />);
    expect(segments()).toBe(1); // mínimo un segmento
    expect(bar().props.accessibilityValue.now).toBe(0);
  });

  it('completed mayor que total se limita al total', async () => {
    await renderWithTheme(<SegmentedProgress total={2} completed={9} accessibilityLabel="Progreso del artículo" />);
    expect(bar().props.accessibilityValue.now).toBe(100);
  });

  it('la variante inversa (sobre tinta) también es accesible', async () => {
    await renderWithTheme(<SegmentedProgress total={2} completed={1} tone="inverse" accessibilityLabel="Progreso del artículo" />);
    expect(bar().props.accessibilityValue.now).toBe(50);
  });
});

describe('SegmentedControl (elección única)', () => {
  const options = [
    { id: 1.5, label: '1.5 min' },
    { id: 2.5, label: '2.5 min' },
    { id: 3.5, label: '3.5 min' },
  ] as const;

  it('es un radiogroup etiquetado y cada segmento un radio con su estado', async () => {
    await renderWithTheme(<SegmentedControl options={options} value={2.5} onChange={() => {}} accessibilityLabel="Duración de cada dosis" />);
    // El contenedor no es "accesible" por sí mismo (cada radio sí): se comprueba por etiqueta y rol.
    expect(screen.getByLabelText('Duración de cada dosis').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: '2.5 min' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: '1.5 min' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('notifica el id (con su tipo numérico) al tocar un segmento', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SegmentedControl options={options} value={2.5} onChange={onChange} accessibilityLabel="Duración de cada dosis" />);
    await fireEvent.press(screen.getByRole('radio', { name: '3.5 min' }));
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it('funciona también con ids de texto', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SegmentedControl options={[{ id: 'a', label: 'Uno' }, { id: 'b', label: 'Dos' }]} value="a" onChange={onChange} accessibilityLabel="Elige" />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Dos' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
