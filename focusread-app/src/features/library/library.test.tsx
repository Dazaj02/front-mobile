import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { buildDemoArticles } from '../../data/mock/demoArticles';
import { es } from '../../i18n/es';
import { useSettingsStore } from '../../state/settingsStore';
import { makeSession } from '../../test/fixtures';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { LibraryScreen } from './LibraryScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));

const TITLES = {
  habits: 'Por qué leer en dosis cortas funciona',
  sleep: 'El sueño como aliado del aprendizaje',
  notes: 'Cómo tomar notas que sí sirven',
};

async function seed() {
  const articles = buildDemoArticles(2.5);
  for (const a of articles) await mockC.localArticles.save(a);
  return articles;
}

const renderLibrary = () => renderScreen('Library', LibraryScreen, { extraScreens: ['Reader', 'Import'] });

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
  useSettingsStore.setState({ targetDoseMinutes: 2.5, hapticsEnabled: false });
});

describe('Biblioteca', () => {
  it('vacía (mock): muestra el estado vacío y permite cargar los artículos de ejemplo', async () => {
    await renderLibrary();
    expect(await screen.findByText(es.library.emptyTitle)).toBeTruthy();
    expect(screen.queryByLabelText(es.library.search)).toBeNull(); // sin búsqueda ni filtros si no hay artículos

    await fireEvent.press(screen.getByRole('button', { name: es.library.loadExamples }));
    expect(await screen.findByText(TITLES.habits)).toBeTruthy();
    expect(screen.getByText(TITLES.sleep)).toBeTruthy();
    expect(screen.getByText(TITLES.notes)).toBeTruthy();
    expect(await mockC.articles.list()).toHaveLength(3);
  });

  it('hay un solo botón Importar (vacía o con artículos)', async () => {
    const { unmount } = await renderLibrary();
    await screen.findByText(es.library.emptyTitle);
    expect(screen.getAllByRole('button', { name: es.library.import })).toHaveLength(1);
    await unmount();

    await seed();
    await renderLibrary();
    await screen.findByText(TITLES.habits);
    expect(screen.getAllByRole('button', { name: es.library.import })).toHaveLength(1);
  });

  it('Importar abre la hoja de importación', async () => {
    const { navigationRef } = await renderLibrary();
    await fireEvent.press(await screen.findByRole('button', { name: es.library.import }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Import'));
  });

  it('filtra por En curso, Guardados y Completados y busca sin acentos', async () => {
    const [habits, sleep, notes] = await seed();
    // habits: 1 dosis completada de N (en curso); notes: todas (completado); sleep: guardado
    await mockC.progress.recordSession(makeSession({ articleId: habits.id, doseId: habits.doses[0].id }));
    for (const d of notes.doses) await mockC.progress.recordSession(makeSession({ articleId: notes.id, doseId: d.id }));
    await mockC.articles.setBookmarked(sleep.id, true);

    await renderLibrary();
    // "habits" aparece dos veces (tarjeta "Continúa leyendo" + tarjeta del artículo)
    expect((await screen.findAllByText(TITLES.habits)).length).toBe(2);

    await fireEvent.press(screen.getByRole('button', { name: es.library.filters.inProgress }));
    expect(screen.getByText(TITLES.habits)).toBeTruthy();
    expect(screen.queryByText(TITLES.sleep)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: es.library.filters.saved }));
    expect(screen.getByText(TITLES.sleep)).toBeTruthy();
    expect(screen.queryByText(TITLES.habits)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: es.library.filters.completed }));
    expect(screen.getByText(TITLES.notes)).toBeTruthy();
    expect(screen.queryByText(TITLES.sleep)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: es.library.filters.all }));
    await fireEvent.changeText(screen.getByLabelText(es.library.search), 'SUENO');
    expect(screen.getByText(TITLES.sleep)).toBeTruthy();
    expect(screen.queryByText(TITLES.notes)).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(es.library.search), 'zzz');
    expect(await screen.findByText(es.library.noResultsTitle)).toBeTruthy();
  });

  it('muestra "Continúa leyendo" con el artículo en curso y abre la dosis pendiente', async () => {
    const [habits] = await seed();
    await mockC.progress.recordSession(makeSession({ articleId: habits.id, doseId: habits.doses[0].id }));
    const { navigationRef } = await renderLibrary();
    expect(await screen.findByText(es.library.continueReading)).toBeTruthy();
    // La dosis pendiente aparece en la tarjeta "Continúa leyendo" y en la fila del artículo.
    expect(screen.getAllByText(es.library.doseOf(2, habits.doseCount))).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Reader'));
    expect(navigationRef.current?.getCurrentRoute()?.params).toEqual({ articleId: habits.id, doseIndex: 1 });
  });

  it('sin artículo en curso no hay tarjeta de continuar; con filtro o búsqueda tampoco', async () => {
    const [habits] = await seed();
    await renderLibrary();
    await screen.findByText(TITLES.habits);
    expect(screen.queryByText(es.library.continueReading)).toBeNull();
    await mockC.progress.recordSession(makeSession({ articleId: habits.id, doseId: habits.doses[0].id }));
  });

  it('tocar una tarjeta abre el lector en su primera dosis pendiente', async () => {
    const [habits] = await seed();
    const { navigationRef } = await renderLibrary();
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${TITLES.habits}`) }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Reader'));
    expect(navigationRef.current?.getCurrentRoute()?.params).toEqual({ articleId: habits.id, doseIndex: 0 });
  });

  it('el favorito cambia al instante y se guarda', async () => {
    await seed();
    await renderLibrary();
    const [first] = await screen.findAllByRole('button', { name: 'Guardar artículo' });
    await fireEvent.press(first);
    expect(await screen.findAllByRole('button', { name: 'Quitar de guardados' })).toHaveLength(1);
    await waitFor(async () => expect(await mockC.articles.list({ bookmarkedOnly: true })).toHaveLength(1));
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    await seed();
    const list = jest.spyOn(mockC.articles, 'list').mockRejectedValueOnce(new Error('disco'));
    await renderLibrary();
    expect(await screen.findByText(es.library.loadFailedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(TITLES.habits)).toBeTruthy();
    list.mockRestore();
  });
});
