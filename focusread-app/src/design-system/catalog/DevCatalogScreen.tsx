import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Divider } from '../atoms/Divider';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { ProgressBar } from '../atoms/ProgressBar';
import { Spinner } from '../atoms/Spinner';
import { Switch } from '../atoms/Switch';
import { TextInputBase } from '../atoms/TextInputBase';
import {
  Banner,
  DoseChecklistItem,
  FilterChipGroup,
  FontSizeStepper,
  FormField,
  PasswordField,
  SearchBar,
  SectionHeader,
  SettingRow,
  SliderField,
  StatTile,
  ThemeSwatch,
  VoiceOption,
} from '../molecules';
import { useWindowClass } from '../layout/useWindowClass';
import {
  ArticleCard,
  AudioMiniDock,
  AuthForm,
  BottomTabBar,
  ContinueReadingCard,
  DailyProgressCard,
  DoseReader,
  EmptyState,
  ErrorState,
  ImportSheet,
  ProviderKeyForm,
  QuizSheet,
  WeeklyChart,
  type ImportDuration,
  type ImportMode,
  type TabItem,
} from '../organisms';
import { SheetTemplate } from '../templates';
import { useSettingsStore } from '../../state/settingsStore';
import { useTheme } from '../theme/useTheme';
import { THEME_MODES, type ThemeMode } from '../tokens';

const THEME_LABELS: Record<ThemeMode, string> = { paper: 'Papel', sepia: 'Sepia', dark: 'Oscuro' };
const noop = () => {};

const TABS: readonly TabItem[] = [
  { key: 'library', label: 'Biblioteca', icon: 'library-outline', iconActive: 'library' },
  { key: 'progress', label: 'Progreso', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={title} />
      {children}
      <Divider />
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

// Solo __DEV__. Cada componente en normal / deshabilitado / error / cargando; el estado
// "presionado" se ve tocando el control.
export function DevCatalogScreen({ onClose }: { onClose: () => void }) {
  const { colors, spacing, layout } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const scale = useSettingsStore((s) => s.readerFontScale);
  const setScale = useSettingsStore((s) => s.setReaderFontScale);

  const [chip, setChip] = useState(true);
  const [sw, setSw] = useState(true);
  const [filter, setFilter] = useState<'all' | 'progress' | 'saved'>('all');
  const [query, setQuery] = useState('');
  const [voice, setVoice] = useState('a');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const win = useWindowClass();
  const [sheet, setSheet] = useState<'import' | 'quiz' | 'provider' | null>(null);
  const [tab, setTab] = useState('library');
  const [importMode, setImportMode] = useState<ImportMode>('text');
  const [importText, setImportText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [duration, setDuration] = useState<ImportDuration>(2.5);
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState<string | null>('chat');
  const [apiKey, setApiKey] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.gutter.compact }}>
        <AppText variant="headline">Catálogo</AppText>
        <IconButton icon="close" accessibilityLabel="Cerrar catálogo" onPress={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: layout.gutter.compact,
          gap: spacing.xl,
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        <Section title="Tema">
          <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
            {THEME_MODES.map((m) => (
              <ThemeSwatch key={m} mode={m} label={THEME_LABELS[m]} selected={theme === m} onPress={() => setTheme(m)} />
            ))}
          </View>
          <FontSizeStepper value={scale} onChange={setScale} />
        </Section>

        <Section title="Tipografía">
          {(['display', 'headline', 'title', 'bodyLarge', 'body', 'label', 'caption', 'reading', 'readingTitle'] as const).map((v) => (
            <AppText key={v} variant={v}>
              {v} — Lectura sin distracciones
            </AppText>
          ))}
          <Row label="Colores de texto">
            {(['primary', 'secondary', 'muted', 'accent', 'success', 'warning', 'danger'] as const).map((c) => (
              <AppText key={c} color={c}>
                {c}
              </AppText>
            ))}
          </Row>
        </Section>

        <Section title="Button">
          <Row label="primary · secondary · ghost">
            <Button label="Primario" onPress={noop} />
            <Button variant="secondary" label="Secundario" onPress={noop} />
            <Button variant="ghost" label="Ghost" onPress={noop} />
          </Row>
          <Row label="con icono · deshabilitado · cargando">
            <Button label="Importar" icon="add" onPress={noop} />
            <Button label="Deshabilitado" disabled onPress={noop} />
            <Button label="Procesando" loading onPress={noop} />
            <Button variant="secondary" label="Cargando" loading onPress={noop} />
          </Row>
        </Section>

        <Section title="IconButton · Icon · Spinner">
          <Row label="normal · seleccionado · deshabilitado">
            <IconButton icon="bookmark-outline" accessibilityLabel="Guardar" onPress={noop} />
            <IconButton icon="bookmark" accessibilityLabel="Guardado" selected onPress={noop} color="accent" />
            <IconButton icon="trash-outline" accessibilityLabel="Borrar" disabled onPress={noop} />
          </Row>
          <Row label="iconos sm · md · lg · spinner">
            <Icon name="headset-outline" size="sm" />
            <Icon name="headset-outline" size="md" />
            <Icon name="headset-outline" size="lg" />
            <Spinner />
            <Spinner size="lg" />
          </Row>
        </Section>

        <Section title="Chip · Badge">
          <Row label="chip normal / seleccionado">
            <Chip label="Todos" selected={chip} onPress={() => setChip((v) => !v)} />
            <Chip label="Guardados" onPress={noop} />
          </Row>
          <Row label="badge por tono">
            <Badge label="Neutral" />
            <Badge label="Acento" tone="accent" />
            <Badge label="Éxito" tone="success" />
            <Badge label="Aviso" tone="warning" />
            <Badge label="Error" tone="danger" />
          </Row>
        </Section>

        <Section title="Switch · ProgressBar">
          <SettingRow
            title="Vibración"
            description="Respuesta háptica al tocar"
            control={<Switch value={sw} onValueChange={setSw} accessibilityLabel="Vibración" />}
          />
          <SettingRow
            title="Deshabilitado"
            control={<Switch value={false} onValueChange={noop} accessibilityLabel="Opción deshabilitada" disabled />}
          />
          <ProgressBar value={0} accessibilityLabel="Progreso vacío" />
          <ProgressBar value={0.4} accessibilityLabel="Progreso de la dosis" />
          <ProgressBar value={1} accessibilityLabel="Progreso completo" />
        </Section>

        <Section title="Inputs">
          <TextInputBase placeholder="Input base" accessibilityLabel="Input base" />
          <TextInputBase placeholder="Input con error" accessibilityLabel="Input con error" error />
          <TextInputBase placeholder="Input deshabilitado" accessibilityLabel="Input deshabilitado" disabled />
          <FormField label="Correo" value={email} onChangeText={setEmail} helpText="Usa el correo de tu cuenta" keyboardType="email-address" autoCapitalize="none" />
          <FormField label="Correo con error" errorText="Ingresa un correo válido" value="correo" onChangeText={noop} />
          <PasswordField label="Contraseña" value={pass} onChangeText={setPass} helpText="Mínimo 8 caracteres" />
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar en la biblioteca" />
        </Section>

        <Section title="Filtros y ajustes">
          <FilterChipGroup
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'progress', label: 'En curso' },
              { id: 'saved', label: 'Guardados' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <SettingRow title="Motor de IA" description="FocusRead (incluido)" onPress={noop} />
          <SliderField label="Velocidad" value={1} min={0.5} max={2} step={0.1} onChange={noop} format={(v) => `${v.toFixed(1)}×`} />
          <VoiceOption name="Voz de sistema" language="es-MX" selected={voice === 'a'} onSelect={() => setVoice('a')} onPreview={noop} />
          <VoiceOption name="Otra voz" language="es-ES" selected={voice === 'b'} onSelect={() => setVoice('b')} onPreview={noop} />
        </Section>

        <Section title="StatTile · DoseChecklistItem">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <StatTile label="Minutos leídos" value="42" icon="time-outline" />
            <StatTile label="Racha" value="5 días" icon="flame-outline" hint="Tu mejor: 9" />
          </View>
          <DoseChecklistItem index={0} title="Introducción" minutes={2.5} done />
          <DoseChecklistItem index={1} title="Desarrollo" minutes={2.5} done={false} current onPress={noop} />
          <DoseChecklistItem index={2} title="Conclusión" minutes={1.5} done={false} />
        </Section>

        <Section title="Banner">
          <Banner tone="info" message="Tu artículo se está procesando" />
          <Banner tone="offline" message="Sin conexión" actionLabel="Reintentar" onAction={noop} />
          <Banner tone="error" message="No pudimos importar el texto" actionLabel="Reintentar" onAction={noop} />
        </Section>

        <Section title="Ventana">
          <AppText variant="body">
            {win.windowClass} · {Math.round(win.width)}×{Math.round(win.height)} dp · {win.isLandscape ? 'horizontal' : 'vertical'} · gutter {win.gutter} · biblioteca {win.libraryColumns} col.
          </AppText>
        </Section>

        <Section title="Biblioteca">
          <ContinueReadingCard title="El futuro de la lectura en pantallas" doseLabel="Dosis 2 de 5" progress={0.4} onContinue={noop} />
          <DailyProgressCard minutesToday={18} dosesToday={6} goalMinutes={30} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flexGrow: 1, flexBasis: layout.readerMaxWidth / 2.5, minWidth: 0 }}>
                <ArticleCard
                  title={i === 0 ? 'Cómo la atención selectiva moldea la memoria de largo plazo' : 'Breve'}
                  category="Ciencia"
                  totalMinutes={12.5}
                  doseCount={5}
                  progress={i === 0 ? 0.6 : 0}
                  bookmarked={i === 0}
                  onPress={noop}
                  onToggleBookmark={noop}
                  bookmarkDisabled={i === 1}
                />
              </View>
            ))}
          </View>
        </Section>

        <Section title="Progreso">
          <WeeklyChart
            data={[
              { label: 'L', fullLabel: 'Lunes', minutes: 12 },
              { label: 'M', fullLabel: 'Martes', minutes: 0 },
              { label: 'X', fullLabel: 'Miércoles', minutes: 25 },
              { label: 'J', fullLabel: 'Jueves', minutes: 7 },
              { label: 'V', fullLabel: 'Viernes', minutes: 18 },
              { label: 'S', fullLabel: 'Sábado', minutes: 0 },
              { label: 'D', fullLabel: 'Domingo', minutes: 3 },
            ]}
          />
        </Section>

        <Section title="Lector">
          <DoseReader
            title="Introducción"
            content={'La atención es un recurso limitado y valioso.\n\nLeer en dosis cortas ayuda a sostenerla sin fatiga.'}
            position={1}
            total={5}
            progress={0.35}
            onPrev={noop}
            onNext={noop}
          />
        </Section>

        <Section title="Formularios de organismo">
          <AuthForm
            variant="register"
            title="Crea tu cuenta"
            submitLabel="Registrarme"
            values={{ email: 'a@b.co', password: '', confirm: '' }}
            errors={{ password: 'Usa al menos 8 caracteres', form: 'No pudimos crear la cuenta' }}
            onChange={noop}
            onSubmit={noop}
            links={[{ label: 'Ya tengo cuenta', onPress: noop }]}
          />
          <EmptyState title="Aún no tienes artículos" message="Importa un texto para empezar" actionLabel="Importar" onAction={noop} />
          <ErrorState title="No pudimos cargar tu biblioteca" message="Revisa tu conexión" onRetry={noop} />
        </Section>

        <Section title="Hojas y dock">
          <Row label="hojas (SheetTemplate)">
            <Button variant="secondary" label="Importar" onPress={() => setSheet('import')} />
            <Button variant="secondary" label="Quiz" onPress={() => setSheet('quiz')} />
            <Button variant="secondary" label="Motor de IA" onPress={() => setSheet('provider')} />
          </Row>
          <View style={{ height: spacing.xxxl * 3 }}>
            <AudioMiniDock title="El futuro de la lectura" playing onToggle={noop} onClose={noop} aboveTabBar={false} />
          </View>
          <BottomTabBar
            tabs={TABS}
            activeKey={tab}
            onSelect={setTab}
          />
        </Section>
      </ScrollView>

      <SheetTemplate visible={sheet === 'import'} title="Importar" onClose={() => setSheet(null)}>
        <ImportSheet
          mode={importMode}
          onModeChange={setImportMode}
          text={importText}
          onTextChange={setImportText}
          url={importUrl}
          onUrlChange={setImportUrl}
          duration={duration}
          onDurationChange={setDuration}
          providerLabel="FocusRead (incluido)"
          status="idle"
          onSubmit={noop}
        />
      </SheetTemplate>
      <SheetTemplate visible={sheet === 'quiz'} title="Comprueba lo leído" onClose={() => setSheet(null)}>
        <QuizSheet
          quiz={{
            question: '¿Qué ayuda a sostener la atención?',
            options: ['Leer en dosis cortas', 'Leer sin pausas', 'Leer de noche'],
            correctIndex: 0,
            explanation: 'Las dosis cortas reducen la fatiga.',
          }}
          onDone={() => setSheet(null)}
        />
      </SheetTemplate>
      <SheetTemplate visible={sheet === 'provider'} title="Motor de IA" onClose={() => setSheet(null)}>
        <ProviderKeyForm
          providers={[
            { id: 'focusread', name: 'FocusRead' },
            { id: 'deepseek', name: 'DeepSeek' },
          ]}
          provider={provider}
          onProviderChange={setProvider}
          models={[{ id: 'chat', label: 'deepseek-chat' }]}
          model={model}
          onModelChange={setModel}
          requiresKey={provider !== 'focusread'}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          hasSavedKey={false}
          onSaveKey={noop}
          onDeleteKey={noop}
          onTest={noop}
          testDisabledReason="Disponible con el servidor"
        />
      </SheetTemplate>
    </SafeAreaView>
  );
}
