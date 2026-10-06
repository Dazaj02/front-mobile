import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getContainer } from '../../data/container';
import { buildDemoArticles } from '../../data/mock/demoArticles';
import type { Article } from '../../domain/contract';
import { useSettingsStore } from '../../state/settingsStore';

export const articlesKey = ['articles'] as const;
export const articleProgressKey = ['articleProgress'] as const;

export function useArticles() {
  return useQuery({ queryKey: articlesKey, queryFn: () => getContainer().articles.list() });
}

export function useArticleProgress() {
  return useQuery({ queryKey: articleProgressKey, queryFn: () => getContainer().progress.articleProgress() });
}

// Favorito con actualización optimista: la UI cambia al instante y se revierte si falla.
export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => getContainer().articles.setBookmarked(id, value),
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: articlesKey });
      const previous = qc.getQueryData<Article[]>(articlesKey);
      qc.setQueryData<Article[]>(articlesKey, (old) => old?.map((a) => (a.id === id ? { ...a, bookmarked: value } : a)));
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(articlesKey, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: articlesKey }),
  });
}

// Elimina el artículo con sus dosis (en live requiere conexión; el error lo gestiona quien llama).
export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getContainer().articles.remove(id),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: articlesKey }), qc.invalidateQueries({ queryKey: articleProgressKey })]),
  });
}

// Solo modo mock: siembra la biblioteca con los artículos de ejemplo (textos originales).
export function useLoadExamples() {
  const qc = useQueryClient();
  const minutes = useSettingsStore((s) => s.targetDoseMinutes);
  return useMutation({
    mutationFn: async () => {
      for (const article of buildDemoArticles(minutes)) await getContainer().localArticles.save(article);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: articlesKey }),
  });
}
