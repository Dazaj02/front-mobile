import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeMode } from '../design-system/tokens';
import { ThemeColors, useLegacyColors } from '../legacy/useLegacyColors';
import { AudioService } from '../services/audioService';
import { UserProfile } from '../types';
import { DEFAULT_USER_PROFILE, StorageService } from '../storage/storageService';

interface LoginScreenProps {
  themeMode: ThemeMode;
  onLoginSuccess: (profile: UserProfile) => void;
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  themeMode,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const colors: ThemeColors = useLegacyColors();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.rivera@focusread.ai');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre para personalizar tus dosis.');
      return;
    }

    setLoading(true);
    AudioService.triggerHaptic('medium');

    // Simular autenticación ultra fluida
    setTimeout(async () => {
      setLoading(false);
      const userProfile: UserProfile = {
        id: `usr-${Date.now()}`,
        name: isSignUp ? name.trim() : (email.includes('alex') ? 'Alex Rivera' : email.split('@')[0]),
        email: email.trim(),
        plan: 'pro',
        isLoggedIn: true,
        joinedDate: 'Marzo 2026',
      };

      await StorageService.saveUserProfile(userProfile);
      AudioService.triggerHaptic('success');
      onLoginSuccess(userProfile);
    }, 700);
  };

  const handleQuickDemo = async () => {
    AudioService.triggerHaptic('success');
    await StorageService.saveUserProfile(DEFAULT_USER_PROFILE);
    onLoginSuccess(DEFAULT_USER_PROFILE);
  };

  const handleSocialLogin = async (provider: 'Google' | 'Apple') => {
    AudioService.triggerHaptic('medium');
    setLoading(true);

    setTimeout(async () => {
      setLoading(false);
      const userProfile: UserProfile = {
        id: `usr-${provider.toLowerCase()}-${Date.now()}`,
        name: provider === 'Apple' ? 'Usuario Apple' : 'Alex Rivera (Google)',
        email: provider === 'Apple' ? 'usuario@privaterelay.appleid.com' : 'alex.rivera@gmail.com',
        plan: 'pro',
        isLoggedIn: true,
        joinedDate: 'Marzo 2026',
      };

      await StorageService.saveUserProfile(userProfile);
      AudioService.triggerHaptic('success');
      onLoginSuccess(userProfile);
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header / Brand */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoIconBox, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>FocusRead AI</Text>
            <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
              Digestión cognitiva & micro-dosis de lectura profunda
            </Text>
          </View>

          {/* Card de Formulario */}
          <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Selector Modo: Iniciar Sesión / Registro */}
            <View style={[styles.tabToggleRow, { backgroundColor: colors.surfaceContainerHigh }]}>
              <TouchableOpacity
                style={[
                  styles.tabToggleBtn,
                  !isSignUp && [styles.tabToggleActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  AudioService.triggerHaptic('light');
                  setIsSignUp(false);
                }}
              >
                <Text
                  style={[
                    styles.tabToggleText,
                    {
                      color: !isSignUp ? colors.text : colors.textSecondary,
                      fontWeight: !isSignUp ? '700' : '500',
                    },
                  ]}
                >
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabToggleBtn,
                  isSignUp && [styles.tabToggleActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => {
                  AudioService.triggerHaptic('light');
                  setIsSignUp(true);
                }}
              >
                <Text
                  style={[
                    styles.tabToggleText,
                    {
                      color: isSignUp ? colors.text : colors.textSecondary,
                      fontWeight: isSignUp ? '700' : '500',
                    },
                  ]}
                >
                  Crear Cuenta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.fieldsContainer}>
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    NOMBRE COMPLETO
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Ej. Alex Rivera"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  CORREO ELECTRÓNICO
                </Text>
                <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="tucorreo@ejemplo.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    CONTRASEÑA
                  </Text>
                  {!isSignUp && (
                    <TouchableOpacity onPress={() => Alert.alert('Recuperación', 'Se ha enviado un enlace seguro para restablecer tu contraseña.')}>
                      <Text style={[styles.forgotLink, { color: colors.primaryContainer }]}>
                        ¿Olvidaste tu clave?
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Botón Principal */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primaryContainer }]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {isSignUp ? 'Empezar Experiencia Zen' : 'Iniciar Sesión'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>o continuar con</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Botones Sociales */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                onPress={() => handleSocialLogin('Google')}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={[styles.socialBtnText, { color: colors.text }]}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border }]}
                onPress={() => handleSocialLogin('Apple')}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={19} color={colors.text} />
                <Text style={[styles.socialBtnText, { color: colors.text }]}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Acceso Rápido / Demo One-Click */}
            <TouchableOpacity
              style={[styles.quickDemoBtn, { backgroundColor: colors.secondaryContainer, borderColor: colors.primaryContainer }]}
              onPress={handleQuickDemo}
              activeOpacity={0.85}
            >
              <View style={[styles.quickDemoBadge, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickDemoTitle, { color: colors.onSecondaryContainer }]}>
                  Acceso Inmediato de Prueba
                </Text>
                <Text style={[styles.quickDemoSub, { color: colors.textSecondary }]}>
                  Ingresar como Alex Rivera (Pro) sin escribir credenciales
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryContainer} />
            </TouchableOpacity>
          </View>

          {/* Footer Zen */}
          <View style={styles.footerRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Privacidad absoluta · Tus lecturas se procesan de forma privada
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#0037b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  authCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabToggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabToggleActive: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabToggleText: {
    fontSize: 13,
  },
  fieldsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginBottom: 18,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  quickDemoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDemoTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickDemoSub: {
    fontSize: 10,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
  },
});
