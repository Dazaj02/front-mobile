import type { UserSettings } from './contract';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'paper',
  readerFontScale: 1,
  targetDoseMinutes: 2.5,
  voiceId: null,
  speechRate: 1,
  speechPitch: 1,
  hapticsEnabled: true,
  quizEnabled: true,
  aiProvider: 'focusread',
  aiModel: null,
};
