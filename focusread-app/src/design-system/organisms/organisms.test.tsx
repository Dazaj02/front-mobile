import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { flattenStyle, renderWithTheme, TEST_INSETS, TestProviders } from '../testUtils';
import {
  ArticleCard,
  AudioMiniDock,
  AuthForm,
  BottomTabBar,
  DailyProgressCard,
  DoseReader,
  EmptyState,
  ErrorState,
  ImportSheet,
  ProviderKeyForm,
  QuizSheet,
  WeeklyChart,
  barHeights,
  dockBottomOffset,
} from '.';

const noop = () => {};

describe('WeeklyChart', () => {
  it('calcula alturas relativas al máximo, con marca mínima para días vacíos', () => {
    expect(barHeights([10, 20, 0], 100, 4)).toEqual([50, 100, 4]);
    expect(barHeights([0, 0], 100, 4)).toEqual([4, 4]);
    expect(barHeights([1], 100, 4)).toEqual([100]);
  });

  it('da a cada barra una etiqueta accesible', async () => {
    await renderWithTheme(
      <WeeklyChart
        data={[
          { label: 'L', fullLabel: 'Lunes', minutes: 12 },
          { label: 'M', fullLabel: 'Martes', minutes: 1 },
        ]}
      />,
    );
    expect(screen.getByLabelText('Lunes, 12 minutos')).toBeTruthy();
    expect(screen.getByLabelText('Martes, 1 minuto')).toBeTruthy();
  });
});

describe('ArticleCard', () => {
  it('resume título, dosis y progreso en una sola etiqueta y separa el favorito', async () => {
    const onToggle = jest.fn();
    await renderWithTheme(
      <ArticleCard
        title="Atención"
        category="Ciencia"
        totalMinutes={10}
        doseCount={4}
        progress={0.5}
        bookmarked={false}
        onPress={noop}
        onToggleBookmark={onToggle}
      />,
    );
    expect(screen.getByRole('button', { name: 'Atención. Ciencia. 4 dosis, 10 min. Progreso 50 %' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar artículo' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('deshabilita el favorito sin conexión', async () => {
    await renderWithTheme(
      <ArticleCard title="A" totalMinutes={1} doseCount={1} progress={0} bookmarked onPress={noop} onToggleBookmark={noop} bookmarkDisabled />,
    );
    expect(screen.getByRole('button', { name: 'Quitar de guardados' }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('BottomTabBar', () => {
  const tabs = [
    { key: 'a', label: 'Biblioteca', icon: 'library-outline', iconActive: 'library' },
    { key: 'b', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
  ] as const;

  it('marca la pestaña activa y notifica la selección', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(<BottomTabBar tabs={tabs} activeKey="a" onSelect={onSelect} />);
    expect(screen.getByRole('tab', { name: 'Biblioteca' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('tab', { name: 'Ajustes' }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('suma el inset inferior a su altura (no queda bajo la barra de gestos)', async () => {
    await renderWithTheme(<BottomTabBar tabs={tabs} activeKey="a" onSelect={noop} />);
    const style = flattenStyle(screen.getByTestId('tab-bar').props.style);
    expect(style.minHeight).toBe(64 + TEST_INSETS.bottom);
    expect(style.paddingBottom).toBe(TEST_INSETS.bottom);
  });
});

describe('AudioMiniDock', () => {
  it('calcula el offset sobre el tabBar respetando el inset', () => {
    expect(dockBottomOffset(64, 24, true)).toBe(88);
    expect(dockBottomOffset(64, 24, false)).toBe(24);
  });

  it('expone controles con etiquetas y alterna reproducción', async () => {
    const onToggle = jest.fn();
    await renderWithTheme(<AudioMiniDock title="Artículo" playing onToggle={onToggle} onClose={noop} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pausar lectura en voz alta' }));
    expect(onToggle).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cerrar reproductor' })).toBeTruthy();
  });
});

describe('QuizSheet', () => {
  const quiz = { question: '¿Cuál?', options: ['A', 'B', 'C'], correctIndex: 1, explanation: 'Porque sí.' };

  it('revela la respuesta correcta con texto (no solo color) y reporta el resultado', async () => {
    const onDone = jest.fn();
    await renderWithTheme(<QuizSheet quiz={quiz} onDone={onDone} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'A' }));
    expect(screen.getByRole('radio', { name: 'A. Incorrecta' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'B. Correcta' })).toBeTruthy();
    expect(screen.getByText('Porque sí.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it('no permite cambiar la respuesta una vez contestada', async () => {
    await renderWithTheme(<QuizSheet quiz={quiz} onDone={noop} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'B' }));
    expect(screen.getByRole('radio', { name: 'A' }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('ImportSheet', () => {
  const base = {
    mode: 'text' as const,
    onModeChange: noop,
    text: '',
    onTextChange: noop,
    url: '',
    onUrlChange: noop,
    duration: 2.5 as const,
    onDurationChange: noop,
    providerLabel: 'FocusRead (incluido)',
    status: 'idle' as const,
    onSubmit: noop,
  };

  it('bloquea enviar con texto corto y lo habilita al llegar al mínimo', async () => {
    const { rerender } = await renderWithTheme(<ImportSheet {...base} text="corto" />);
    expect(screen.getByRole('button', { name: 'Crear dosis' }).props.accessibilityState).toMatchObject({ disabled: true });
    await rerender(
      <TestProviders>
        <ImportSheet {...base} text={'x'.repeat(300)} />
      </TestProviders>,
    );
    expect(screen.getByRole('button', { name: 'Crear dosis' }).props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('muestra el proveedor activo y el motivo de bloqueo sin conexión', async () => {
    await renderWithTheme(<ImportSheet {...base} text={'x'.repeat(300)} disabledReason="Sin conexión" />);
    expect(screen.getByText('Motor de IA: FocusRead (incluido)')).toBeTruthy();
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear dosis' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('muestra el error y la advertencia de degradación', async () => {
    await renderWithTheme(<ImportSheet {...base} status="error" errorMessage="No se pudo procesar" warningMessage="Sin resumen ni quiz" />);
    expect(screen.getByText('No se pudo procesar')).toBeTruthy();
    expect(screen.getByText('Sin resumen ni quiz')).toBeTruthy();
  });

  it('el modo enlace pide URL', async () => {
    await renderWithTheme(<ImportSheet {...base} mode="url" />);
    expect(screen.getByLabelText('Enlace del artículo')).toBeTruthy();
  });
});

describe('ProviderKeyForm', () => {
  const base = {
    providers: [
      { id: 'focusread', name: 'FocusRead' },
      { id: 'openai', name: 'OpenAI' },
    ],
    provider: 'focusread',
    onProviderChange: noop,
    models: [],
    model: null,
    onModelChange: noop,
    requiresKey: false,
    apiKey: '',
    onApiKeyChange: noop,
    hasSavedKey: false,
    onSaveKey: noop,
    onDeleteKey: noop,
    onTest: noop,
  };

  it('no pide key para el proveedor incluido', async () => {
    await renderWithTheme(<ProviderKeyForm {...base} />);
    expect(screen.queryByLabelText('Tu API key')).toBeNull();
  });

  it('enmascara la key y ofrece borrarla si ya existe', async () => {
    await renderWithTheme(<ProviderKeyForm {...base} provider="openai" requiresKey hasSavedKey apiKey="sk-x" />);
    expect(screen.getByLabelText('Tu API key').props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Borrar key' })).toBeTruthy();
  });

  it('deshabilita "Probar conexión" con motivo', async () => {
    await renderWithTheme(<ProviderKeyForm {...base} provider="openai" requiresKey hasSavedKey testDisabledReason="Disponible con el servidor" />);
    expect(screen.getByRole('button', { name: 'Probar conexión' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText('Disponible con el servidor')).toBeTruthy();
  });

  it('el proveedor incluido no muestra "Probar conexión"', async () => {
    await renderWithTheme(<ProviderKeyForm {...base} />);
    expect(screen.queryByRole('button', { name: 'Probar conexión' })).toBeNull();
  });
});

describe('AuthForm', () => {
  const props = { title: 'T', submitLabel: 'Enviar', values: { email: '', password: '', confirm: '' }, onChange: noop, onSubmit: noop };

  it('login pide correo y contraseña', async () => {
    await renderWithTheme(<AuthForm variant="login" {...props} />);
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.queryByLabelText('Confirmar contraseña')).toBeNull();
  });

  it('registro añade confirmación y recuperar solo pide correo', async () => {
    const { unmount } = await renderWithTheme(<AuthForm variant="register" {...props} />);
    expect(screen.getByLabelText('Confirmar contraseña')).toBeTruthy();
    await unmount();
    await renderWithTheme(<AuthForm variant="recover" {...props} />);
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
  });

  it('muestra errores por campo y de formulario', async () => {
    await renderWithTheme(<AuthForm variant="login" {...props} errors={{ email: 'Correo inválido', form: 'Credenciales incorrectas' }} />);
    expect(screen.getByText('Correo inválido')).toBeTruthy();
    expect(screen.getByText('Credenciales incorrectas')).toBeTruthy();
  });

  it('en carga bloquea el envío', async () => {
    await renderWithTheme(<AuthForm variant="login" {...props} loading />);
    expect(screen.getByRole('button', { name: 'Enviar' }).props.accessibilityState).toMatchObject({ busy: true });
  });
});

describe('DoseReader', () => {
  it('muestra posición, párrafos y etiqueta final en la última dosis', async () => {
    await renderWithTheme(<DoseReader title="T" content={'Uno.\n\nDos.'} position={2} total={3} progress={0.5} onPrev={noop} onNext={noop} />);
    expect(screen.getByText('Dosis 3 de 3')).toBeTruthy();
    expect(screen.getByText('Uno.')).toBeTruthy();
    expect(screen.getByText('Dos.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terminar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeTruthy();
  });
});

describe('EmptyState y ErrorState', () => {
  it('EmptyState ofrece acción', async () => {
    const onAction = jest.fn();
    await renderWithTheme(<EmptyState title="Vacío" actionLabel="Importar" onAction={onAction} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Importar' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('ErrorState anuncia alerta y permite reintentar', async () => {
    const onRetry = jest.fn();
    await renderWithTheme(<ErrorState title="Falló" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('DailyProgressCard', () => {
  it('con racha anuncia los días en la etiqueta accesible y el anillo queda oculto', async () => {
    await renderWithTheme(<DailyProgressCard minutesToday={6} dosesToday={2} streakDays={3} />);
    expect(screen.getByLabelText(/Hoy: 6 min leídos, 2 dosis completadas\. Racha de 3 días/)).toBeTruthy();
  });

  it('sin racha no cambia la etiqueta', async () => {
    await renderWithTheme(<DailyProgressCard minutesToday={0} dosesToday={1} />);
    expect(screen.getByLabelText('Hoy: 0 min leídos, 1 dosis completada')).toBeTruthy();
  });
});
