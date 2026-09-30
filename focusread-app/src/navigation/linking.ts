import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { AuthStackParamList } from './types';

// Deep links (scheme: focusread):
//   focusread://auth/callback  → verificación de correo (intercambio del código PKCE)
//   focusread://auth/reset     → nueva contraseña
// En Expo Go el prefijo lo aporta Linking.createURL('/') (exp://…/--/).
export const linkingConfig: LinkingOptions<AuthStackParamList>['config'] = {
  screens: {
    Welcome: '',
    AuthCallback: 'auth/callback',
    ResetPassword: 'auth/reset',
  },
};

export const linking: LinkingOptions<AuthStackParamList> = {
  prefixes: [Linking.createURL('/'), 'focusread://'],
  config: linkingConfig,
};
