import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
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
import { ErrorState } from '../../design-system/organisms/ErrorState';
import { AppScreen } from '../shared/AppScreen';
import { useTheme } from '../../design-system/theme/useTheme';
import { getContainer } from '../../data/container';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { useNetworkGate } from '../../services/network';
import { applyFilter, LIBRARY_FILTERS, nextDoseIndex, pickContinueReading, toLibraryItems, type LibraryFilter } from './libraryFilters';
import { useArticleProgress, useArticles, useLoadExamples, useToggleBookmark } from './useLibraryData';

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { spacing } = useTheme();
  const { libraryColumns } = useWindowClass();
  const articles = useArticles();
  const progress = useArticleProgress();
  const toggleBookmark = useToggleBookmark();
  const loadExamples = useLoadExamples();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const gate = useNetworkGate(); // favorito requiere conexión (solo en live)

  const items = useMemo(() => toLibraryItems(articles.data ?? [], progress.data ?? []), [articles.data, progress.data]);
  const visible = useMemo(() => applyFilter(items, filter, query), [items, filter, query]);
  const continueItem = useMemo(() => pickContinueReading(items), [items]);
  const showContinue = continueItem && filter === 'all' && query.trim() === '';

  // Reparte las tarjetas en columnas según la clase de ventana (1 en compacto, 2 en medio y expandido).
  const columns = useMemo(() => {
    const cols: (typeof visible)[] = Array.from({ length: libraryColumns }, () => []);
    visible.forEach((item, i) => cols[i % libraryColumns].push(item));
    return cols;
  }, [visible, libraryColumns]);

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
        // Un solo botón Importar en toda la app.
        actions: [{ icon: 'add', label: es.library.import, onPress: openImport }],
      }}
    >
      {items.length > 0 ? (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder={es.library.search} />
          <FilterChipGroup options={filterOptions} value={filter} onChange={setFilter} />
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
