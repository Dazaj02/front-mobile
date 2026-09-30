import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Article, MicroDose } from '../types';
import type { ThemeMode } from '../design-system/tokens';
import { ThemeColors, useLegacyColors } from '../legacy/useLegacyColors';
import { AudioService } from '../services/audioService';

interface ZenReaderScreenProps {
  article: Article;
  currentDoseIndex: number;
  themeMode: ThemeMode;
  speechRate?: number;
  voiceSpeaker?: import('../types').VoiceSpeakerId;
  selectedVoiceIdentifier?: string;
  onChangeTheme: (mode: ThemeMode) => void;
  onBack: () => void;
  onCompleteDose: (articleId: string, doseId: string) => void;
}

export const ZenReaderScreen: React.FC<ZenReaderScreenProps> = ({
  article,
  currentDoseIndex,
  themeMode,
  speechRate = 1.25,
  voiceSpeaker = 'Elena',
  selectedVoiceIdentifier,
  onChangeTheme,
  onBack,
  onCompleteDose,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const colors: ThemeColors = useLegacyColors();
  const [activeDoseIdx, setActiveDoseIdx] = useState(currentDoseIndex);
  const [fontSize, setFontSize] = useState<number>(18);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Estado para el Micro-Quiz Socrático
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const flatListRef = useRef<FlatList<MicroDose>>(null);
  const timerRef = useRef<any>(null);

  const totalDoses = article.microDoses.length;
  const currentDose: MicroDose = article.microDoses[activeDoseIdx] || article.microDoses[0];

  useEffect(() => {
    setRemainingSeconds(currentDose.estimatedSeconds);
    setIsPlayingAudio(false);
    AudioService.stop();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      AudioService.stop();
    };
  }, [activeDoseIdx, currentDose]);

  const toggleAudio = () => {
    if (isPlayingAudio) {
      AudioService.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      AudioService.speak(currentDose.contentChunk, {
        rate: speechRate,
        speaker: voiceSpeaker,
        voiceIdentifier: selectedVoiceIdentifier,
        onDone: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }
  };

  const handleFinishDose = () => {
    AudioService.triggerHaptic('success');
    AudioService.stop();
    setIsPlayingAudio(false);

    if (currentDose.quiz) {
      setSelectedQuizOption(null);
      setQuizSubmitted(false);
      setQuizModalVisible(true);
    } else {
      finalizeDoseCompletion();
    }
  };

  const finalizeDoseCompletion = () => {
    onCompleteDose(article.id, currentDose.id);
    if (activeDoseIdx < totalDoses - 1) {
      scrollToDose(activeDoseIdx + 1);
    } else {
      onBack();
    }
  };

  const scrollToDose = (index: number) => {
    if (index >= 0 && index < totalDoses) {
      AudioService.triggerHaptic('light');
      setActiveDoseIdx(index);
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / windowWidth);
    if (newIndex >= 0 && newIndex < totalDoses && newIndex !== activeDoseIdx) {
      AudioService.triggerHaptic('light');
      setActiveDoseIdx(newIndex);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header Zen */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceContainer }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Atrás</Text>
        </TouchableOpacity>

        {/* Stepper / Dots interactivos */}
        <View style={styles.doseIndicatorCol}>
          <Text style={[styles.doseIndicatorText, { color: colors.primaryContainer }]}>
            DOSIS {activeDoseIdx + 1} DE {totalDoses} · SWIPE DISPONIBLE
          </Text>
          <View style={styles.stepperMiniRow}>
            {article.microDoses.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => scrollToDose(i)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View
                  style={[
                    styles.miniDot,
                    {
                      backgroundColor: i === activeDoseIdx ? colors.primaryContainer : colors.surfaceContainerHighest,
                      width: i === activeDoseIdx ? 18 : 6,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setFontSize(prev => (prev >= 24 ? 16 : prev + 2))}
          >
            <Ionicons name="text-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipeable Micro-Doses Horizontal FlatList */}
      <FlatList
        ref={flatListRef}
        data={article.microDoses}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentDoseIndex < totalDoses ? currentDoseIndex : 0}
        getItemLayout={(_, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={{ width: windowWidth, flex: 1 }}>
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentPadding}
              showsVerticalScrollIndicator={false}
            >
              {/* Badge Superior de Dosis */}
              <View style={styles.doseMetaRow}>
                <View style={[styles.doseBadge, { backgroundColor: colors.secondaryContainer }]}>
                  <Ionicons name="sparkles" size={12} color={colors.onSecondaryContainer} />
                  <Text style={[styles.doseBadgeText, { color: colors.onSecondaryContainer }]}>
                    Dosis {index + 1} de {totalDoses}
                  </Text>
                </View>
                <Text style={[styles.doseTimeEstimate, { color: colors.textSecondary }]}>
                  ~{Math.max(1, Math.round(item.estimatedSeconds / 60))} min de asimilación
                </Text>
              </View>

              <Text style={[styles.doseTitleHeading, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.articleOrigin, { color: colors.textSecondary }]}>
                De: {article.title} · {article.author}
              </Text>

              <View style={[styles.zenQuoteBox, { backgroundColor: colors.secondaryContainer, borderLeftColor: colors.primaryContainer }]}>
                <Text style={[styles.zenQuoteText, { color: colors.onSecondaryContainer }]}>
                  "Tu mente es un santuario. Elimina la sobrecarga y absorbe la idea esencial."
                </Text>
              </View>

              <Text
                style={[
                  styles.doseParagraphs,
                  {
                    color: colors.text,
                    fontSize: fontSize,
                    lineHeight: fontSize * 1.6,
                  },
                ]}
              >
                {item.contentChunk}
              </Text>

              {/* Guía de Navegación por Swipe */}
              <View style={[styles.swipeHelperBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}>
                <View style={styles.swipeHelperRow}>
                  {index > 0 ? (
                    <TouchableOpacity
                      style={[styles.swipeNavBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                      onPress={() => scrollToDose(index - 1)}
                    >
                      <Ionicons name="arrow-back" size={14} color={colors.text} />
                      <Text style={[styles.swipeNavBtnText, { color: colors.text }]}>Anterior</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 80 }} />
                  )}

                  <View style={styles.swipeCues}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.primaryContainer} />
                    <Text style={[styles.swipeCuesText, { color: colors.textSecondary }]}>
                      Desliza para cambiar
                    </Text>
                  </View>

                  {index < totalDoses - 1 ? (
                    <TouchableOpacity
                      style={[styles.swipeNavBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                      onPress={() => scrollToDose(index + 1)}
                    >
                      <Text style={[styles.swipeNavBtnText, { color: colors.text }]}>Siguiente</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.text} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 80 }} />
                  )}
                </View>
              </View>

              {/* Botón de Finalizar / Completar Dosis */}
              <View style={styles.finishBtnContainer}>
                <TouchableOpacity
                  style={[styles.finishBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={handleFinishDose}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.finishBtnText}>
                    {index === totalDoses - 1 ? 'Completar Artículo' : 'Completar Dosis y Continuar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      />

      {/* Dock Flotante de Audio Zen */}
      <View style={[styles.dockContainer, { backgroundColor: colors.dockBackground, borderTopColor: colors.border }]}>
        <View style={styles.dockInner}>
          <View style={styles.dockLeft}>
            <View style={[styles.audioIconCircle, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons
                name={isPlayingAudio ? 'volume-high' : 'headset'}
                size={18}
                color={colors.primaryContainer}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dockTitle, { color: colors.text }]} numberOfLines={1}>
                {currentDose.title}
              </Text>
              <Text style={[styles.dockTimer, { color: colors.textSecondary }]}>
                {formatTimer(remainingSeconds)} · {speechRate}x Voz Neural ({voiceSpeaker})
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primaryContainer }]}
            onPress={toggleAudio}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlayingAudio ? 'pause' : 'play'}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Quiz Socrático de Retención Activa */}
      {currentDose.quiz && (
        <Modal
          visible={quizModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQuizModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.quizModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.quizHeader}>
                <Ionicons name="bulb" size={24} color={colors.primaryContainer} />
                <Text style={[styles.quizTitle, { color: colors.text }]}>Micro-Quiz Socrático</Text>
              </View>

              <Text style={[styles.quizQuestion, { color: colors.text }]}>
                {currentDose.quiz.question}
              </Text>

              <View style={styles.quizOptionsGroup}>
                {currentDose.quiz.options.map((opt, idx) => {
                  const isSelected = selectedQuizOption === idx;
                  const isCorrect = idx === currentDose.quiz?.correctIndex;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.quizOptionBtn,
                        {
                          backgroundColor:
                            quizSubmitted && isCorrect
                              ? colors.success + '25'
                              : quizSubmitted && isSelected && !isCorrect
                              ? '#EF444425'
                              : isSelected
                              ? colors.secondaryContainer
                              : colors.surfaceContainerLow,
                          borderColor: isSelected ? colors.primaryContainer : 'transparent',
                        },
                      ]}
                      onPress={() => !quizSubmitted && setSelectedQuizOption(idx)}
                      disabled={quizSubmitted}
                    >
                      <Text
                        style={[
                          styles.quizOptionText,
                          {
                            color: colors.text,
                            fontWeight: isSelected ? '700' : '400',
                          },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {quizSubmitted && (
                <Text style={[styles.quizExplanation, { color: colors.textSecondary }]}>
                  💡 {currentDose.quiz.explanation}
                </Text>
              )}

              <View style={styles.quizActionsRow}>
                {!quizSubmitted ? (
                  <TouchableOpacity
                    style={[
                      styles.quizSubmitBtn,
                      {
                        backgroundColor: selectedQuizOption !== null ? colors.primaryContainer : colors.surfaceContainerHighest,
                      },
                    ]}
                    disabled={selectedQuizOption === null}
                    onPress={() => {
                      AudioService.triggerHaptic('success');
                      setQuizSubmitted(true);
                    }}
                  >
                    <Text style={styles.quizSubmitText}>Comprobar Respuesta</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.quizSubmitBtn, { backgroundColor: colors.primaryContainer }]}
                    onPress={() => {
                      setQuizModalVisible(false);
                      finalizeDoseCompletion();
                    }}
                  >
                    <Text style={styles.quizSubmitText}>Continuar al Siguiente Nivel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 13, fontWeight: '600' },
  doseIndicatorCol: { alignItems: 'center', gap: 4 },
  doseIndicatorText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  stepperMiniRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  miniDot: { height: 5, borderRadius: 2.5 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: { padding: 6 },
  contentScroll: { flex: 1 },
  contentPadding: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  doseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  doseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  doseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  doseTimeEstimate: {
    fontSize: 11,
  },
  doseTitleHeading: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 4 },
  articleOrigin: { fontSize: 12, marginBottom: 16 },
  zenQuoteBox: { padding: 12, borderRadius: 10, borderLeftWidth: 4, marginBottom: 20 },
  zenQuoteText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  doseParagraphs: { textAlign: 'justify', letterSpacing: 0.2 },
  swipeHelperBox: {
    marginTop: 24,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  swipeHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swipeNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  swipeNavBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  swipeCues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeCuesText: {
    fontSize: 11,
    fontWeight: '500',
  },
  finishBtnContainer: { marginTop: 24, alignItems: 'center' },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  finishBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  dockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dockInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dockLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 },
  audioIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dockTitle: { fontSize: 13, fontWeight: '600' },
  dockTimer: { fontSize: 11, marginTop: 2 },
  playButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  quizModalCard: { borderRadius: 20, padding: 22, borderWidth: 1, gap: 14 },
  quizHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizTitle: { fontSize: 18, fontWeight: '700' },
  quizQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  quizOptionsGroup: { gap: 8 },
  quizOptionBtn: { padding: 12, borderRadius: 10, borderWidth: 1.5 },
  quizOptionText: { fontSize: 13, lineHeight: 18 },
  quizExplanation: { fontSize: 12, fontStyle: 'italic', lineHeight: 17 },
  quizActionsRow: { marginTop: 6 },
  quizSubmitBtn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quizSubmitText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
