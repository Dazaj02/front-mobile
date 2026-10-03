import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { IconButton } from '../../design-system/atoms/IconButton';
import { Spinner } from '../../design-system/atoms/Spinner';
import { FontSizeStepper } from '../../design-system/molecules/FontSizeStepper';
import { DoseReader } from '../../design-system/organisms/DoseReader';
import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ErrorState } from '../../design-system/organisms/ErrorState';
import { QuizSheet } from '../../design-system/organisms/QuizSheet';
import { ReaderTemplate } from '../../design-system/templates/ReaderTemplate';
import { SheetTemplate } from '../../design-system/templates/SheetTemplate';
import { useTheme } from '../../design-system/theme/useTheme';
import { THEME_MODES } from '../../design-system/tokens';
import { getContainer } from '../../data/container';
import type { ArticleWithDoses } from '../../domain/contract';
import { es } from '../../i18n/es';
import { newId } from '../../lib/ids';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { usePlayerStore } from '../../state/playerStore';
import { useSettingsStore } from '../../state/settingsStore';
import { articleProgressKey, articlesKey } from '../library/useLibraryData';
import { readingStatsKey } from '../progress/useReadingStats';
import { recordReadingSession } from './recordReadingSession';
import { useActiveTime } from './useActiveTime';

// Por debajo de este tiempo una visita abandonada no se registra (evita ruido en las estadísticas).
export const MIN_PARTIAL_SECONDS = 5;

export function ReaderScreen({ navigation, route }: NativeStackScreenProps<AppStackParamList, 'Reader'>) {
  const { articleId, doseIndex = 0 } = route.params;
  const article = useQuery({ queryKey: ['article', articleId], queryFn: () => getContainer().articles.getWithDoses(articleId) });
  const exit = () => navigation.goBack();

  if (article.isLoading) {
    return (
      <ReaderTemplate top={<IconButton icon="chevron-back" accessibilityLabel={es.common.back} onPress={exit} />}>
        <Spinner size="lg" />
      </ReaderTemplate>
    );
  }
  if (article.isError) {
    return (
      <ReaderTemplate top={<IconButton icon="chevron-back" accessibilityLabel={es.common.back} onPress={exit} />}>
        <ErrorState title={es.reader.loadFailedTitle} onRetry={() => void article.refetch()} />
      </ReaderTemplate>
    );
  }
  if (!article.data) {
    return (
      <ReaderTemplate top={<IconButton icon="chevron-back" accessibilityLabel={es.common.back} onPress={exit} />}>
        <EmptyState icon="alert-circle-outline" title={es.reader.notFoundTitle} actionLabel={es.common.back} onAction={exit} />
      </ReaderTemplate>
    );
  }
  return <ReaderBody article={article.data} initialIndex={doseIndex} onExit={exit} />;
}

function ReaderBody({ article, initialIndex, onExit }: { article: ArticleWithDoses; initialIndex: number; onExit: () => void }) {
  const qc = useQueryClient();
  const { spacing } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const scale = useSettingsStore((s) => s.readerFontScale);
  const setScale = useSettingsStore((s) => s.setReaderFontScale);
  const quizEnabled = useSettingsStore((s) => s.quizEnabled);
  const player = usePlayerStore();

  const last = article.doses.length - 1;
  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), last));
  const [quizOpen, setQuizOpen] = useState(false);
  const dose = article.doses[index];
  const time = useActiveTime(dose.id);
  const completed = useRef(new Set<string>());

  // Última dosis / tiempo visibles para el guardado al salir (el cleanup no ve el estado actual).
  const latest = useRef({ dose, time });
  useEffect(() => {
    latest.current = { dose, time };
  });

  const save = async (d: typeof dose, t: typeof time, done: boolean, quizCorrect: boolean | null) => {
    const endedAt = new Date(Date.now()); // misma fuente de reloj que ActiveTimer y startedAt
    // La base exige active_seconds ≤ (ended_at − started_at) + 5 s: nunca se envía más que el tiempo transcurrido.
    const startedAt = t.getStartedAt();
    const elapsedSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    await recordReadingSession({
      id: newId(),
      articleId: article.id,
      doseId: d.id,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      activeSeconds: Math.min(t.getSeconds(), elapsedSeconds),
      completed: done,
      quizCorrect,
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: articleProgressKey }),
      qc.invalidateQueries({ queryKey: articlesKey }),
      qc.invalidateQueries({ queryKey: readingStatsKey }),
    ]);
  };

  // Sesión parcial: se guardó tiempo real de lectura pero la dosis no se terminó.
  const flushPartial = () => {
    const { dose: d, time: t } = latest.current;
    if (completed.current.has(d.id) || t.getSeconds() < MIN_PARTIAL_SECONDS) return;
    completed.current.add(d.id);
    void save(d, t, false, null);
  };
  useEffect(() => flushPartial, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishDose = async (quizCorrect: boolean | null) => {
    completed.current.add(dose.id);
    void haptic('success');
    await save(dose, time, true, quizCorrect);
    if (index >= last) onExit();
    else setIndex(index + 1);
  };

  const handleNext = () => {
    if (quizEnabled && dose.quiz) setQuizOpen(true);
    else void finishDose(null);
  };

  const handlePrev = () => {
    flushPartial();
    setIndex(index - 1);
  };

  const listening = player.playing && player.item?.articleId === article.id && player.item.doseIndex === index;
  const toggleAudio = () => {
    if (listening) player.toggle();
    else player.play({ articleId: article.id, title: article.title, doseIndex: index, text: dose.content });
  };
  const nextTheme = THEME_MODES[(THEME_MODES.indexOf(theme) + 1) % THEME_MODES.length];

  const top = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
      <IconButton icon="chevron-back" accessibilityLabel={es.common.back} onPress={onExit} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
        <IconButton
          icon={listening ? 'stop-circle-outline' : 'headset-outline'}
          accessibilityLabel={listening ? es.reader.stopListening : es.reader.listen}
          onPress={toggleAudio}
          color={listening ? 'accent' : 'primary'}
        />
        <IconButton icon="color-palette-outline" accessibilityLabel={es.reader.theme} onPress={() => setTheme(nextTheme)} />
        <FontSizeStepper value={scale} onChange={setScale} />
      </View>
    </View>
  );

  return (
    <ReaderTemplate top={top} scrollKey={dose.id}>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="overline" color="muted" numberOfLines={2}>
          {article.title}
        </AppText>
        {index === 0 && article.summaryPoints.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="overline" color="accent" accessibilityRole="header">
              {es.reader.summary}
            </AppText>
            {article.summaryPoints.map((p, i) => (
              <AppText key={i} variant="quote" color="secondary">
                — {p}
              </AppText>
            ))}
          </View>
        ) : null}
        <DoseReader
          title={dose.title}
          content={dose.content}
          position={index}
          total={article.doses.length}
          progress={Math.min(1, time.seconds / Math.max(1, dose.estMinutes * 60))}
          onPrev={index > 0 ? handlePrev : undefined}
          onNext={handleNext}
        />
      </View>
      {dose.quiz ? (
        <SheetTemplate visible={quizOpen} title={es.reader.quizTitle} onClose={() => setQuizOpen(false)}>
          <QuizSheet
            key={dose.id}
            quiz={dose.quiz}
            onDone={(correct) => {
              setQuizOpen(false);
              void finishDose(correct);
            }}
          />
        </SheetTemplate>
      ) : null}
    </ReaderTemplate>
  );
}
