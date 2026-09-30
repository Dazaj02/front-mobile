import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { MyDosesScreen } from './src/screens/MyDosesScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ZenReaderScreen } from './src/screens/ZenReaderScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { StorageService } from './src/storage/storageService';
import { DeepSeekService } from './src/services/deepSeekService';
import { AudioService } from './src/services/audioService';
import { Article, UserStats, AppSettings, UserProfile } from './src/types';
import { ThemeMode, themes } from './src/theme/tokens';
import { DEFAULT_APP_SETTINGS } from './src/data/mockArticles';

type ActiveTab = 'explorar' | 'mi_dosis' | 'progreso' | 'ajustes';
const TABS: ActiveTab[] = ['explorar', 'mi_dosis', 'progreso', 'ajustes'];


export default function App() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<UserStats>({
    currentStreakDays: 7,
    todayMinutesRead: 15,
    dailyGoalMinutes: 20,
    completedDosesCount: 14,
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [themeMode, setThemeMode] = useState<ThemeMode>('paper');

  // Navegación
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorar');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [initialDoseIndex, setInitialDoseIndex] = useState<number>(0);

  // Dimensiones y Ref para Swipe entre Pestañas Principales
  const { width: windowWidth } = useWindowDimensions();
  const tabsScrollRef = useRef<ScrollView>(null);

  const handleSwitchTab = (tab: ActiveTab) => {
    AudioService.triggerHaptic('light');
    setActiveTab(tab);
    const index = TABS.indexOf(tab);
    if (index !== -1 && tabsScrollRef.current) {
      tabsScrollRef.current.scrollTo({ x: index * windowWidth, animated: true });
    }
  };

  const handleTabsScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / windowWidth);
    if (newIndex >= 0 && newIndex < TABS.length) {
      const targetTab = TABS[newIndex];
      if (targetTab !== activeTab) {
        AudioService.triggerHaptic('light');
        setActiveTab(targetTab);
      }
    }
  };

  // Modal para Importar URL o Fragmentar con IA
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // Mini-Dock Audio Global Flotante
  const [floatingAudioArticle, setFloatingAudioArticle] = useState<Article | null>(null);
  const [floatingDoseIndex, setFloatingDoseIndex] = useState<number>(0);
  const [isFloatingAudioPlaying, setIsFloatingAudioPlaying] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loadedProfile = await StorageService.getUserProfile();
      const loadedArticles = await StorageService.getArticles();
      const loadedStats = await StorageService.getUserStats();
      const loadedSettings = await StorageService.getSettings();
      setUserProfile(loadedProfile);
      setArticles(loadedArticles);
      setStats(loadedStats);
      setSettings(loadedSettings);
      if (loadedArticles.length > 0) {
        setFloatingAudioArticle(loadedArticles[0]);
      }
    } catch (e) {
      console.warn('Error loading local data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = (article: Article, doseIdx: number = 0) => {
    AudioService.triggerHaptic('light');
    setActiveArticle(article);
    setInitialDoseIndex(doseIdx);
  };

  const handleQuickListen = (article: Article, doseIdx: number = 0) => {
    AudioService.triggerHaptic('medium');
    setFloatingAudioArticle(article);
    setFloatingDoseIndex(doseIdx);
    const dose = article.microDoses[doseIdx] || article.microDoses[0];
    if (dose) {
      setIsFloatingAudioPlaying(true);
      AudioService.speak(dose.contentChunk, {
        rate: settings.speechRate,
        speaker: settings.voiceSpeaker,
        voiceIdentifier: settings.selectedVoiceIdentifier,
        onDone: () => setIsFloatingAudioPlaying(false),
        onError: () => setIsFloatingAudioPlaying(false),
      });
    }
  };

  const toggleFloatingPlayPause = () => {
    if (!floatingAudioArticle) return;
    const dose = floatingAudioArticle.microDoses[floatingDoseIndex];
    if (!dose) return;

    if (isFloatingAudioPlaying) {
      AudioService.stop();
      setIsFloatingAudioPlaying(false);
    } else {
      setIsFloatingAudioPlaying(true);
      AudioService.speak(dose.contentChunk, {
        rate: settings.speechRate,
        speaker: settings.voiceSpeaker,
        voiceIdentifier: settings.selectedVoiceIdentifier,
        onDone: () => setIsFloatingAudioPlaying(false),
        onError: () => setIsFloatingAudioPlaying(false),
      });
    }
  };

  const handleCompleteDose = async (articleId: string, doseId: string) => {
    const res = await StorageService.markDoseCompleted(articleId, doseId);
    setArticles(res.articles);
    setStats(res.stats);

    const updated = res.articles.find(a => a.id === articleId);
    if (updated) {
      setActiveArticle(updated);
    }
  };

  const handleToggleBookmark = async (articleId: string) => {
    AudioService.triggerHaptic('light');
    const updated = await StorageService.toggleBookmark(articleId);
    setArticles(updated);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);
  };

  // Procesamiento real con DeepSeek API o fallback local inteligente
  const handleProcessImport = async () => {
    if (!importInput.trim()) {
      Alert.alert('Entrada vacía', 'Por favor ingresa una URL válida o pega un texto para procesar.');
      return;
    }

    setIsProcessingAi(true);
    AudioService.triggerHaptic('medium');

    try {
      const newArticle = await DeepSeekService.processArticle(importInput.trim(), settings);
      const updated = [newArticle, ...articles];
      setArticles(updated);
      await StorageService.saveArticles(updated);

      setImportInput('');
      setImportModalVisible(false);
      AudioService.triggerHaptic('success');
      Alert.alert(
        '¡Dosis Lista!',
        `El contenido "${newArticle.title}" fue fragmentado en ${newArticle.microDoses.length} micro-dosis con preguntas socráticas.`
      );
      handleSwitchTab('mi_dosis');
    } catch (e: any) {
      Alert.alert('Error al procesar', e.message || 'Ocurrió un error al procesar el artículo con IA.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  const colors = themes[themeMode];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
      </View>
    );
  }

  // Si no hay sesión iniciada, mostrar LoginScreen acorde a la app
  if (!userProfile || !userProfile.isLoggedIn) {
    return (
      <LoginScreen
        themeMode={themeMode}
        onLoginSuccess={profile => setUserProfile(profile)}
      />
    );
  }

  // Si está en el modo Zen Reader (pantalla completa)
  if (activeArticle) {
    return (
      <ZenReaderScreen
        article={activeArticle}
        currentDoseIndex={initialDoseIndex}
        themeMode={themeMode}
        speechRate={settings.speechRate}
        voiceSpeaker={settings.voiceSpeaker}
        selectedVoiceIdentifier={settings.selectedVoiceIdentifier}
        onChangeTheme={setThemeMode}
        onBack={() => {
          AudioService.stop();
          setActiveArticle(null);
        }}
        onCompleteDose={handleCompleteDose}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header Global Persistente */}
      <View style={[styles.globalHeader, { borderBottomColor: colors.surfaceContainer, backgroundColor: colors.background }]}>
        <View style={styles.brandLeft}>
          <View style={[styles.brandLogoCircle, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>FocusRead AI</Text>
            <Text style={[styles.tabSubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'explorar' && 'EXPLORAR'}
              {activeTab === 'mi_dosis' && 'MI DOSIS'}
              {activeTab === 'progreso' && 'PROGRESO'}
              {activeTab === 'ajustes' && 'AJUSTES'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.profileHeaderBtn, { backgroundColor: colors.surfaceContainer }]}
          onPress={() => handleSwitchTab('ajustes')}
        >
          <Ionicons name="person" size={16} color={colors.text} />
          <View style={[styles.headerDot, { backgroundColor: colors.tertiaryContainer }]} />
        </TouchableOpacity>
      </View>

      {/* Contenedor de Pestañas con Navegación por Swipe Horizontal */}
      <ScrollView
        ref={tabsScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleTabsScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ width: windowWidth, flex: 1 }}>
          <HomeScreen
            articles={articles}
            stats={stats}
            themeMode={themeMode}
            onSelectArticle={handleSelectArticle}
            onQuickListen={handleQuickListen}
            onOpenImportModal={() => setImportModalVisible(true)}
            onNavigateToTab={handleSwitchTab}
            onToggleBookmark={handleToggleBookmark}
          />
        </View>

        <View style={{ width: windowWidth, flex: 1 }}>
          <MyDosesScreen
            articles={articles}
            themeMode={themeMode}
            onSelectArticle={handleSelectArticle}
            onQuickListen={handleQuickListen}
            onOpenImportModal={() => setImportModalVisible(true)}
            onToggleBookmark={handleToggleBookmark}
          />
        </View>

        <View style={{ width: windowWidth, flex: 1 }}>
          <ProgressScreen stats={stats} themeMode={themeMode} />
        </View>

        <View style={{ width: windowWidth, flex: 1 }}>
          <SettingsScreen
            settings={settings}
            themeMode={themeMode}
            userProfile={userProfile || undefined}
            onChangeTheme={setThemeMode}
            onUpdateSettings={handleUpdateSettings}
            onLogout={async () => {
              const loggedOut = await StorageService.logoutUser();
              setUserProfile(loggedOut);
            }}
          />
        </View>
      </ScrollView>

      {/* Floating Audio Zen Mini Player Persistente */}
      {floatingAudioArticle && (
        <View style={[styles.floatingDock, { backgroundColor: colors.dockBackground, borderColor: colors.border }]}>
          <View style={styles.floatingDockContent}>
            <View style={[styles.floatingIconBox, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="headset" size={17} color="#FFFFFF" />
            </View>

            <TouchableOpacity
              style={styles.floatingTextCol}
              onPress={() => handleSelectArticle(floatingAudioArticle, floatingDoseIndex)}
            >
              <Text style={[styles.floatingTitle, { color: colors.text }]} numberOfLines={1}>
                {floatingAudioArticle.microDoses[floatingDoseIndex]?.title || floatingAudioArticle.title}
              </Text>
              <Text style={[styles.floatingSub, { color: colors.textSecondary }]}>
                Dosis {floatingDoseIndex + 1} · {settings.speechRate}x Voz Neural
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingPlayBtn, { backgroundColor: colors.primaryContainer }]}
              onPress={toggleFloatingPlayPause}
            >
              <Ionicons
                name={isFloatingAudioPlaying ? 'pause' : 'play'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Barra de Navegación Inferior (Global Persistent Tabs) */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.surfaceContainer }]}>
        <TouchableOpacity
          style={[
            styles.bottomNavItem,
            activeTab === 'explorar' && [styles.bottomNavActive, { backgroundColor: colors.secondaryContainer }],
          ]}
          onPress={() => handleSwitchTab('explorar')}
        >
          <Ionicons
            name={activeTab === 'explorar' ? 'compass' : 'compass-outline'}
            size={22}
            color={activeTab === 'explorar' ? colors.primaryContainer : colors.textSecondary}
          />
          <Text
            style={[
              styles.bottomNavText,
              {
                color: activeTab === 'explorar' ? colors.primaryContainer : colors.textSecondary,
                fontWeight: activeTab === 'explorar' ? '700' : '500',
              },
            ]}
          >
            Explorar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomNavItem,
            activeTab === 'mi_dosis' && [styles.bottomNavActive, { backgroundColor: colors.secondaryContainer }],
          ]}
          onPress={() => handleSwitchTab('mi_dosis')}
        >
          <Ionicons
            name={activeTab === 'mi_dosis' ? 'book' : 'book-outline'}
            size={22}
            color={activeTab === 'mi_dosis' ? colors.primaryContainer : colors.textSecondary}
          />
          <Text
            style={[
              styles.bottomNavText,
              {
                color: activeTab === 'mi_dosis' ? colors.primaryContainer : colors.textSecondary,
                fontWeight: activeTab === 'mi_dosis' ? '700' : '500',
              },
            ]}
          >
            Mi Dosis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomNavItem,
            activeTab === 'progreso' && [styles.bottomNavActive, { backgroundColor: colors.secondaryContainer }],
          ]}
          onPress={() => handleSwitchTab('progreso')}
        >
          <Ionicons
            name={activeTab === 'progreso' ? 'flame' : 'flame-outline'}
            size={22}
            color={activeTab === 'progreso' ? colors.primaryContainer : colors.textSecondary}
          />
          <Text
            style={[
              styles.bottomNavText,
              {
                color: activeTab === 'progreso' ? colors.primaryContainer : colors.textSecondary,
                fontWeight: activeTab === 'progreso' ? '700' : '500',
              },
            ]}
          >
            Progreso
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomNavItem,
            activeTab === 'ajustes' && [styles.bottomNavActive, { backgroundColor: colors.secondaryContainer }],
          ]}
          onPress={() => handleSwitchTab('ajustes')}
        >
          <Ionicons
            name={activeTab === 'ajustes' ? 'settings' : 'settings-outline'}
            size={22}
            color={activeTab === 'ajustes' ? colors.primaryContainer : colors.textSecondary}
          />
          <Text
            style={[
              styles.bottomNavText,
              {
                color: activeTab === 'ajustes' ? colors.primaryContainer : colors.textSecondary,
                fontWeight: activeTab === 'ajustes' ? '700' : '500',
              },
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal para Fragmentar URL / Texto con DeepSeek IA */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.importModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={20} color={colors.primaryContainer} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Fragmentar con DeepSeek IA</Text>
              </View>
              <TouchableOpacity onPress={() => setImportModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Pega un enlace web o texto denso. DeepSeek extraerá la síntesis ejecutiva y creará micro-dosis de {settings.targetDurationMinutes} min con preguntas socráticas.
            </Text>

            <TextInput
              style={[
                styles.modalTextInput,
                { backgroundColor: colors.surfaceContainerLow, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="https://ejemplo.com/articulo o texto largo..."
              placeholderTextColor={colors.textMuted}
              value={importInput}
              onChangeText={setImportInput}
              multiline
              autoCapitalize="none"
            />

            {/* Selector de Enlaces de Prueba Rápida */}
            <View style={styles.quickTestSection}>
              <View style={styles.quickTestHeader}>
                <Ionicons name="flask-outline" size={13} color={colors.primaryContainer} />
                <Text style={[styles.quickTestLabel, { color: colors.primaryContainer }]}>
                  PROBAR CON DIFERENTES ENLACES (1-TAP):
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickTestScroll}
              >
                <TouchableOpacity
                  style={[styles.testLinkChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                  onPress={() => {
                    AudioService.triggerHaptic('light');
                    setImportInput('https://www.tiktok.com/@neurociencia.focus/video/73918237');
                  }}
                >
                  <Text style={styles.testChipIcon}>🎵</Text>
                  <View>
                    <Text style={[styles.testChipTitle, { color: colors.text }]}>TikTok</Text>
                    <Text style={[styles.testChipDesc, { color: colors.textSecondary }]}>Dopamina & Redes</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testLinkChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                  onPress={() => {
                    AudioService.triggerHaptic('light');
                    setImportInput('https://youtube.com/watch?v=k3G_y3u1aQ');
                  }}
                >
                  <Text style={styles.testChipIcon}>▶️</Text>
                  <View>
                    <Text style={[styles.testChipTitle, { color: colors.text }]}>YouTube</Text>
                    <Text style={[styles.testChipDesc, { color: colors.textSecondary }]}>Deep Work</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testLinkChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                  onPress={() => {
                    AudioService.triggerHaptic('light');
                    setImportInput('https://towardsdatascience.com/cognitive-ai-agents');
                  }}
                >
                  <Text style={styles.testChipIcon}>📝</Text>
                  <View>
                    <Text style={[styles.testChipTitle, { color: colors.text }]}>Medium</Text>
                    <Text style={[styles.testChipDesc, { color: colors.textSecondary }]}>Agentes IA</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testLinkChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                  onPress={() => {
                    AudioService.triggerHaptic('light');
                    setImportInput('https://es.wikipedia.org/wiki/Neuroplasticidad');
                  }}
                >
                  <Text style={styles.testChipIcon}>🧠</Text>
                  <View>
                    <Text style={[styles.testChipTitle, { color: colors.text }]}>Wikipedia</Text>
                    <Text style={[styles.testChipDesc, { color: colors.textSecondary }]}>Neuroplasticidad</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testLinkChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                  onPress={() => {
                    AudioService.triggerHaptic('light');
                    setImportInput('https://techcrunch.com/2026/future-of-attention');
                  }}
                >
                  <Text style={styles.testChipIcon}>📰</Text>
                  <View>
                    <Text style={[styles.testChipTitle, { color: colors.text }]}>Tech Blog</Text>
                    <Text style={[styles.testChipDesc, { color: colors.textSecondary }]}>Futuro Atención</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceContainer }]}
                onPress={() => setImportModalVisible(false)}
                disabled={isProcessingAi}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={handleProcessImport}
                disabled={isProcessingAi}
              >
                {isProcessingAi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Sintetizar Dosis</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  globalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogoCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 16, fontWeight: '700', lineHeight: 18 },
  tabSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  profileHeaderBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
  floatingDock: {
    position: 'absolute',
    bottom: 68,
    left: 16,
    right: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  floatingDockContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  floatingIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  floatingTextCol: { flex: 1 },
  floatingTitle: { fontSize: 12, fontWeight: '600' },
  floatingSub: { fontSize: 10 },
  floatingPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 2,
  },
  bottomNavActive: {
    paddingHorizontal: 16,
  },
  bottomNavText: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  importModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, lineHeight: 18 },
  modalTextInput: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  quickTestSection: {
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  quickTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickTestLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  quickTestScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  testLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  testChipIcon: {
    fontSize: 16,
  },
  testChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  testChipDesc: {
    fontSize: 9,
    marginTop: 1,
  },
});
