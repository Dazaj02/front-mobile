import type { Article } from '../../domain/contract';
import { makeArticle } from '../../test/fixtures';
import { applyFilter, isCompleted, isInProgress, listCategories, nextDoseIndex, pickContinueReading, toLibraryItems, withCategories } from './libraryFilters';

const article = (o: Partial<Article> & { id?: string }): Article => {
  const { doses: _doses, ...base } = makeArticle({ title: o.title ?? 'A', doseCount: o.doseCount ?? 4 });
  return { ...base, ...o };
};

const a = article({ title: 'Sueño y memoria', doseCount: 4, totalMinutes: 10 });
const b = article({ title: 'Notas útiles', doseCount: 2, totalMinutes: 2.5, bookmarked: true, category: 'Estudio' });
const c = article({ title: 'Hábitos', doseCount: 3, totalMinutes: 7.5 });

const items = toLibraryItems(
  [a, b, c],
  [
    { articleId: a.id, completedDoses: 2, lastReadAt: '2026-09-20T10:00:00.000Z' },
    { articleId: b.id, completedDoses: 2, lastReadAt: '2026-09-25T10:00:00.000Z' },
  ],
);

describe('toLibraryItems', () => {
  it('une artículos con su progreso y calcula la fracción', () => {
    expect(items.map((i) => i.progress)).toEqual([0.5, 1, 0]);
    expect(items[2]).toMatchObject({ completedDoses: 0, lastReadAt: null });
  });

  it('nunca supera el total de dosis', () => {
    const [i] = toLibraryItems([b], [{ articleId: b.id, completedDoses: 99, lastReadAt: null }]);
    expect(i.completedDoses).toBe(2);
    expect(i.progress).toBe(1);
  });
});

describe('applyFilter', () => {
  const titles = (f: Parameters<typeof applyFilter>[1], q?: string) => applyFilter(items, f, q).map((i) => i.article.title);

  it('Todos', () => expect(titles('all')).toEqual(['Sueño y memoria', 'Notas útiles', 'Hábitos']));
  it('En curso: empezados y sin terminar', () => expect(titles('inProgress')).toEqual(['Sueño y memoria']));
  it('Guardados', () => expect(titles('saved')).toEqual(['Notas útiles']));
  it('Completados', () => expect(titles('completed')).toEqual(['Notas útiles']));
  it('< 3 min', () => expect(titles('short')).toEqual(['Notas útiles']));

  it('la búsqueda ignora mayúsculas y acentos y mira título y categoría', () => {
    expect(titles('all', 'SUENO')).toEqual(['Sueño y memoria']);
    expect(titles('all', 'habitos')).toEqual(['Hábitos']);
    expect(titles('all', 'estudio')).toEqual(['Notas útiles']);
    expect(titles('all', 'nada')).toEqual([]);
  });

  it('la búsqueda se combina con el filtro', () => {
    expect(titles('saved', 'memoria')).toEqual([]);
    expect(titles('saved', 'notas')).toEqual(['Notas útiles']);
  });
});

describe('continuar leyendo', () => {
  it('elige el artículo en curso leído más recientemente', () => {
    const newer = toLibraryItems([a, c], [
      { articleId: a.id, completedDoses: 1, lastReadAt: '2026-09-01T00:00:00.000Z' },
      { articleId: c.id, completedDoses: 1, lastReadAt: '2026-09-28T00:00:00.000Z' },
    ]);
    expect(pickContinueReading(newer)?.article.id).toBe(c.id);
  });

  it('es null si no hay nada en curso', () => {
    expect(pickContinueReading(toLibraryItems([c], []))).toBeNull();
  });

  it('nextDoseIndex apunta a la primera dosis pendiente y nunca se pasa del final', () => {
    expect(nextDoseIndex(items[0])).toBe(2);
    expect(nextDoseIndex(items[1])).toBe(1); // completado: última dosis
    expect(nextDoseIndex(items[2])).toBe(0);
  });

  it('isInProgress / isCompleted son excluyentes', () => {
    for (const i of items) expect(isInProgress(i) && isCompleted(i)).toBe(false);
  });
});

describe('categorías', () => {
  it('la categoría elegida por el usuario prevalece sobre la del servidor', () => {
    const merged = withCategories(items, { [a.id]: 'Ciencia', [b.id]: 'Salud' });
    expect(merged.map((i) => i.article.category)).toEqual(['Ciencia', 'Salud', 'Pruebas']);
  });

  it('listCategories devuelve las presentes, sin repetir y ordenadas', () => {
    const merged = withCategories(items, { [a.id]: 'Salud', [c.id]: 'Salud' });
    expect(listCategories(merged)).toEqual(['Estudio', 'Salud']);
  });

  it('applyFilter filtra por categoría y se combina con la búsqueda', () => {
    const merged = withCategories(items, { [a.id]: 'Salud', [c.id]: 'Salud' });
    expect(applyFilter(merged, 'all', '', 'Salud').map((i) => i.article.title)).toEqual(['Sueño y memoria', 'Hábitos']);
    expect(applyFilter(merged, 'all', 'habit', 'Salud').map((i) => i.article.title)).toEqual(['Hábitos']);
  });
});
