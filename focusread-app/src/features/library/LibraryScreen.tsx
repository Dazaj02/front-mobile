import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../design-system/atoms/Button';
import { Spinner } from '../../design-system/atoms/Spinner';
import { useWindowClass } from '../../design-system/layout/useWindowClass';
import { FilterChipGroup } from '../../design-system/molecules/FilterChipGroup';
import { SearchBar } from '../../design-system/molecules/SearchBar';
import { ArticleCard } from '../../design-system/organisms/ArticleCard';
import { ContinueReadingCard } from '../../design-system/organisms/ContinueReadingCard';
import { EmptyState } from '../../design-system/organisms/EmptyState';
import { DailyProgressCard } from '../../design-system/organisms/DailyProgressCard';
import { ErrorState } from '../../design-system/organisms/ErrorState';
import { AppScreen } from '../shared/AppScreen';
import { useTheme } from '../../design-system/theme/useTheme';
import { useCategoryStore } from '../../state/categoryStore';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { useNetworkGate } from '../../services/network';
import { applyFilter, LIBRARY_FILTERS, listCategories, nextDoseIndex, pickContinueReading, toLibraryItems, withCategories, type LibraryFilter } from './libraryFilters';
import { useReadingStats } from '../progress/useReadingStats';
import { useArticleProgress, useArticles, useDeleteArticle, useLoadExamples, useToggleBookmark } from './useLibraryData';

const ALL_CATEGORIES = '__all__';

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { spacing } = useTheme();
  const { libraryColumns } = useWindowClass();
  const articles = useArticles();
  const progress = useArticleProgress();
  const toggleBookmark = useToggleBookmark();
  const loadExamples = useLoadExamples();
  const deleteArticle = useDeleteArticle();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const overrides = useCategoryStore((s) => s.byArticle);
  const hydrateCategories = useCategoryStore((s) => s.hydrate);
  useEffect(() => void hydrateCategories(), [hydrateCategories]);
  const stats = useReadingStats();
  const gate = useNetworkGate(); // favorito requiere conexión (solo en live)

  const items = useMemo(() => withCategories(toLibraryItems(articles.data ?? [], progress.data ?? []), overrides), [articles.data, progress.data, overrides]);
  const categories = useMemo(() => listCategories(items), [items]);
  const visible = useMemo(() => applyFilter(items, filter, query, category), [items, filter, query, category]);
  const continueItem = useMemo(() => pickContinueReading(items), [items]);
  const showContinue = continueItem && filter === 'all' && category === null && query.trim() === '';

  // Reparte las tarjetas en columnas según la clase de ventana (1 en compacto, 2 en medio y expandido).
  const columns = useMemo(() => {
    const cols: (typeof visible)[] = Array.from({ length: libraryColumns }, () => []);
    visible.forEach((item, i) => cols[i % libraryColumns].push(item));
    return cols;
  }, [visible, libraryColumns]);

  // Confirmación antes de borrar: es irreversible y arrastra las dosis del artículo.
  const confirmDelete = (id: string, title: string) =>
    Alert.alert(es.library.deleteTitle, es.library.deleteBody(title), [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.library.delete,
        style: 'destructive',
        onPress: () =>
          deleteArticle.mutate(id, {
            onSuccess: () => void haptic('success'),
            onError: (e) => Alert.alert(es.library.deleteFailed, errorMessage(e)),
          }),
      },
    ]);

  const openReader = (articleId: string, doseIndex: number) => navigation.navigate('Reader', { articleId, doseIndex });
  const openImport = () => navigation.navigate('Import');

  const filterOptions = LIBRARY_FILTERS.map((id) => ({ id, label: es.library.filters[id] }));
  const loading = articles.isLoading || progress.isLoading;
  const failed = articles.isError || progress.isError;

  let body: React.ReactNode;
  if (loading) {
    body = <Spinner size="lg" />;
  } else if (failed) {
    body = (
      <ErrorState
        title={es.library.loadFailedTitle}
        onRetry={() => {
          void articles.refetch();
          void progress.refetch();
        }}
      />
    );
  } else if (items.length === 0) {
    body = (
      <View style={{ gap: spacing.md }}>
        {/* Sin segundo botón "Importar": la única entrada es la acción del encabezado. */}
        <EmptyState title={es.library.emptyTitle} message={es.library.emptyMessage} />
        {getContainer().mode === 'mock' ? (
          <Button variant="secondary" label={es.library.loadExamples} loading={loadExamples.isPending} onPress={() => loadExamples.mutate()} />
        ) : null}
      </View>
    );
  } else if (visible.length === 0) {
    body = <EmptyState icon="search-outline" title={es.library.noResultsTitle} message={es.library.noResultsMessage} />;
  } else {
    body = (
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        {columns.map((col, c) => (
          <View key={c} style={{ flex: 1, minWidth: 0, gap: spacing.md }}>
            {col.map((item) => (
              <ArticleCard
                key={item.article.id}
                title={item.article.title}
                category={item.article.category}
                totalMinutes={item.article.totalMinutes}
                doseCount={item.article.doseCount}
                progress={item.progress}
                bookmarked={item.article.bookmarked}
                bookmarkDisabled={gate.blocked}
                deleteDisabled={gate.blocked}
                onDelete={() => confirmDelete(item.article.id, item.article.title)}
                onPress={() => openReader(item.article.id, nextDoseIndex(item))}
                onToggleBookmark={() => {
                  void haptic('selection');
                  toggleBookmark.mutate({ id: item.article.id, value: !item.article.bookmarked });
                }}
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <AppScreen
      header={{
        title: es.library.title,
        brand: es.appName,
        // Un solo botón Importar en toda la app.
        actions: [{ icon: 'add', label: es.library.import, onPress: openImport, primary: true }],
      }}
    >
      {items.length > 0 && stats.data ? (
        <DailyProgressCard minutesToday={stats.data.minutesToday} dosesToday={stats.data.dosesToday} streakDays={stats.data.streakDays} />
      ) : null}
      {items.length > 0 ? (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder={es.library.search} />
          <FilterChipGroup options={filterOptions} value={filter} onChange={setFilter} />
          {categories.length > 0 ? (
            <FilterChipGroup
              options={[{ id: ALL_CATEGORIES, label: es.library.allCategories }, ...categories.map((c) => ({ id: c, label: c }))]}
              value={category ?? ALL_CATEGORIES}
              onChange={(c) => setCategory(c === ALL_CATEGORIES ? null : c)}
            />
          ) : null}
        </>
      ) : null}
      {showContinue ? (
        <ContinueReadingCard
          title={continueItem.article.title}
          doseLabel={es.library.doseOf(continueItem.completedDoses + 1, continueItem.article.doseCount)}
          progress={continueItem.progress}
          onContinue={() => openReader(continueItem.article.id, nextDoseIndex(continueItem))}
        />
      ) : null}
      {body}
    </AppScreen>
  );
}
