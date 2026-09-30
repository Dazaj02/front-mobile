import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '../../lib/errors';
import { renderWithTheme } from '../../design-system/testUtils';
import { errorMessage, es } from '../../i18n/es';
import { ApiErrorCodeSchema } from '../../domain/contract';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { VerifyEmailScreen, RESEND_COOLDOWN_SECONDS } from './VerifyEmailScreen';
import { AuthCallbackScreen } from './AuthCallbackScreen';
import { EmailSchema, LoginSchema, NewPasswordSchema, RegisterSchema, validate } from './schemas';
import { useCooldown } from './useCooldown';

const mockAuth = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  resendVerification: jest.fn(),
  requestPasswordReset: jest.fn(),
  updatePassword: jest.fn(),
  handleAuthCallback: jest.fn(),
};
jest.mock('../../data/container', () => ({
  getContainer: () => ({ auth: mockAuth, devSignIn: undefined }),
}));

const nav = () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() });
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

beforeEach(() => {
  Object.values(mockAuth).forEach((fn) => fn.mockReset());
});

describe('validación zod', () => {
  it('correo: requerido y con formato válido', () => {
    expect(EmailSchema.safeParse('').success).toBe(false);
    expect(EmailSchema.safeParse('sin-arroba').success).toBe(false);
    expect(EmailSchema.safeParse('  ana@correo.com ').success).toBe(true);
  });

  it('contraseña nueva: 8+ caracteres con letras y números', () => {
    expect(NewPasswordSchema.safeParse('corta1').success).toBe(false);
    expect(NewPasswordSchema.safeParse('sololetras').success).toBe(false);
    expect(NewPasswordSchema.safeParse('12345678').success).toBe(false);
    expect(NewPasswordSchema.safeParse('Clave1234').success).toBe(true);
  });

  it('registro exige que la confirmación coincida', () => {
    const r = validate(RegisterSchema, { email: 'a@b.co', password: 'Clave1234', confirm: 'otra' });
    expect(r.errors).toEqual({ confirm: es.auth.passwordMismatch });
  });

  it('login solo exige correo válido y contraseña no vacía', () => {
    expect(validate(LoginSchema, { email: 'a@b.co', password: 'x' }).errors).toBeNull();
    expect(validate(LoginSchema, { email: 'a@b.co', password: '' }).errors).toEqual({ password: es.auth.passwordRequired });
  });
});

describe('LoginScreen', () => {
  const setup = async () => {
    const navigation = nav();
    await renderWithTheme(<LoginScreen navigation={navigation as never} route={{ key: 'l', name: 'Login' } as never} />);
    return navigation;
  };

  it('muestra errores de validación sin llamar al servicio', async () => {
    await setup();
    await fireEvent.press(screen.getByRole('button', { name: es.auth.loginSubmit }));
    expect(await screen.findByText(es.auth.emailRequired)).toBeTruthy();
    expect(screen.getByText(es.auth.passwordRequired)).toBeTruthy();
    expect(mockAuth.signIn).not.toHaveBeenCalled();
  });

  it('inicia sesión con los datos normalizados', async () => {
    mockAuth.signIn.mockResolvedValue({ userId: 'u', email: 'ana@correo.com' });
    await setup();
    await type('Correo electrónico', '  ana@correo.com ');
    await type('Contraseña', 'Clave1234');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.loginSubmit }));
    await waitFor(() => expect(mockAuth.signIn).toHaveBeenCalledWith('ana@correo.com', 'Clave1234'));
  });

  it('traduce los errores del servicio y no expone texto técnico', async () => {
    mockAuth.signIn.mockRejectedValue(new AppError('INVALID_CREDENTIALS', 'invalid login credentials (raw)'));
    await setup();
    await type('Correo electrónico', 'ana@correo.com');
    await type('Contraseña', 'Clave1234');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.loginSubmit }));
    expect(await screen.findByText(es.errors.INVALID_CREDENTIALS)).toBeTruthy();
    expect(screen.queryByText(/raw/)).toBeNull();
  });

  it('si el correo no está verificado lleva a "Verifica tu correo"', async () => {
    mockAuth.signIn.mockRejectedValue(new AppError('EMAIL_NOT_CONFIRMED', 'x'));
    const navigation = await setup();
    await type('Correo electrónico', 'ana@correo.com');
    await type('Contraseña', 'Clave1234');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.loginSubmit }));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('VerifyEmail', { email: 'ana@correo.com' }));
  });

  it('muestra el aviso de correo verificado', async () => {
    await renderWithTheme(<LoginScreen navigation={nav() as never} route={{ key: 'l', name: 'Login', params: { notice: 'verified' } } as never} />);
    expect(screen.getByText(es.auth.verifiedNotice)).toBeTruthy();
  });
});

describe('RegisterScreen', () => {
  const setup = async () => {
    const navigation = nav();
    await renderWithTheme(<RegisterScreen navigation={navigation as never} route={{ key: 'r', name: 'Register' } as never} />);
    return navigation;
  };

  it('rechaza contraseñas débiles y no coincidentes', async () => {
    await setup();
    await type('Correo electrónico', 'ana@correo.com');
    await type('Contraseña', 'sololetras');
    await type('Confirmar contraseña', 'otra');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.registerSubmit }));
    expect(await screen.findByText(es.auth.passwordRules)).toBeTruthy();
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('registra y pasa a "Verifica tu correo"', async () => {
    mockAuth.signUp.mockResolvedValue({ needsEmailVerification: true });
    const navigation = await setup();
    await type('Correo electrónico', 'ana@correo.com');
    await type('Contraseña', 'Clave1234');
    await type('Confirmar contraseña', 'Clave1234');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.registerSubmit }));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('VerifyEmail', { email: 'ana@correo.com' }));
    expect(mockAuth.signUp).toHaveBeenCalledWith('ana@correo.com', 'Clave1234');
  });
});

describe('useCooldown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('cuenta hacia atrás y se reinicia con start()', async () => {
    const { result } = await renderHook(() => useCooldown(3));
    expect(result.current).toMatchObject({ remaining: 3, canAct: false });
    await act(async () => void jest.advanceTimersByTime(3000));
    expect(result.current).toMatchObject({ remaining: 0, canAct: true });
    await act(async () => result.current.start());
    expect(result.current.remaining).toBe(3);
  });
});

describe('VerifyEmailScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('limita el reenvío a una vez cada 60 s', async () => {
    mockAuth.resendVerification.mockResolvedValue(undefined);
    await renderWithTheme(<VerifyEmailScreen navigation={nav() as never} route={{ key: 'v', name: 'VerifyEmail', params: { email: 'ana@correo.com' } } as never} />);
    expect(screen.getByText(es.auth.verifyBody('ana@correo.com'))).toBeTruthy();

    const btn = () => screen.getByRole('button', { name: new RegExp(`^(${es.auth.resend}|Reenviar en \\d+ s)$`) });
    expect(btn().props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText(es.auth.resendIn(RESEND_COOLDOWN_SECONDS))).toBeTruthy();

    await act(async () => void jest.advanceTimersByTime(59_000));
    expect(btn().props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => void jest.advanceTimersByTime(1_000));
    expect(btn().props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(btn());
    await act(async () => void (await Promise.resolve()));
    expect(mockAuth.resendVerification).toHaveBeenCalledTimes(1);
    expect(mockAuth.resendVerification).toHaveBeenCalledWith('ana@correo.com');
    expect(btn().props.accessibilityState).toMatchObject({ disabled: true }); // vuelve a esperar 60 s
  });
});

describe('ForgotPasswordScreen y ResetPasswordScreen', () => {
  it('pide el enlace y muestra el aviso', async () => {
    mockAuth.requestPasswordReset.mockResolvedValue(undefined);
    await renderWithTheme(<ForgotPasswordScreen navigation={nav() as never} route={{ key: 'f', name: 'ForgotPassword' } as never} />);
    await type('Correo electrónico', 'ana@correo.com');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.forgotSubmit }));
    expect(await screen.findByText(es.auth.forgotSent)).toBeTruthy();
    expect(mockAuth.requestPasswordReset).toHaveBeenCalledWith('ana@correo.com');
  });

  it('actualiza la contraseña y vuelve al login con aviso', async () => {
    mockAuth.updatePassword.mockResolvedValue(undefined);
    const navigation = nav();
    await renderWithTheme(<ResetPasswordScreen navigation={navigation as never} route={{ key: 'p', name: 'ResetPassword' } as never} />);
    await type('Nueva contraseña', 'Clave1234');
    await type('Confirmar contraseña', 'Clave1234');
    await fireEvent.press(screen.getByRole('button', { name: es.auth.resetSubmit }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Login', { notice: 'passwordUpdated' }));
  });
});

describe('AuthCallbackScreen', () => {
  const run = async (result: string) => {
    mockAuth.handleAuthCallback.mockResolvedValue(result);
    const navigation = nav();
    await renderWithTheme(<AuthCallbackScreen navigation={navigation as never} route={{ key: 'c', name: 'AuthCallback', params: { code: 'abc' } } as never} />);
    return navigation;
  };

  it('correo verificado → Login con aviso', async () => {
    const navigation = await run('verified');
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Login', { notice: 'verified' }));
    expect(mockAuth.handleAuthCallback.mock.calls[0][0]).toContain('auth/callback');
    expect(mockAuth.handleAuthCallback.mock.calls[0][0]).toContain('code=abc');
  });

  it('recuperación → pantalla de nueva contraseña', async () => {
    const navigation = await run('recovery');
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('ResetPassword'));
  });

  it('enlace desconocido → mensaje de error', async () => {
    await run('unknown');
    expect(await screen.findByText(es.auth.callbackInvalid)).toBeTruthy();
  });
});

describe('mensajes de error (i18n)', () => {
  it('todos los códigos del contrato tienen mensaje en español', () => {
    for (const code of ApiErrorCodeSchema.options) {
      expect(typeof es.errors[code]).toBe('string');
      expect(es.errors[code].length).toBeGreaterThan(5);
    }
  });

  it('errorMessage traduce por código, añade Retry-After y oculta errores desconocidos', () => {
    expect(errorMessage(new AppError('QUOTA_EXCEEDED', 'raw', { retryAfterSeconds: 7200 }))).toContain('120 min');
    expect(errorMessage(new AppError('RATE_LIMITED', 'raw', { retryAfterSeconds: 20 }))).toContain('20 s');
    expect(errorMessage(new Error('stack trace interno'))).toBe(es.unknownError);
    expect(errorMessage('cualquier cosa')).toBe(es.unknownError);
  });
});
