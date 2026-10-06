import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { logger } from '../lib/logger';

const KEY = 'focusread.categories.v1';

interface CategoryState {
  byArticle: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  assign: (articleId: string, category: string) => void;
}

// Categoría elegida por el usuario por artículo (prevalece sobre la del servidor); persiste en AsyncStorage.
export const useCategoryStore = create<CategoryState>((set, get) => ({
  byArticle: {},
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const stored = parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
      set({ byArticle: { ...stored, ...get().byArticle }, hydrated: true });
    } catch (e) {
      logger.warn('No se pudieron leer las categorías', e);
      set({ hydrated: true });
    }
  },
  assign: (articleId, category) => {
    const byArticle = { ...get().byArticle, [articleId]: category };
    set({ byArticle });
    AsyncStorage.setItem(KEY, JSON.stringify(byArticle)).catch((e) => logger.warn('No se pudo guardar la categoría', e));
  },
}));
