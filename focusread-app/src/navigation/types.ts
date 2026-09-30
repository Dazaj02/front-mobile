import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { notice?: 'verified' | 'passwordUpdated' } | undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;
  AuthCallback: { code?: string } | undefined;
};

export type TabParamList = {
  Library: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Reader: { articleId: string; doseIndex?: number };
  Import: undefined;
  AIEngine: undefined;
  Account: undefined;
  DevCatalog: undefined; // solo __DEV__
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppStackParamList {}
  }
}
