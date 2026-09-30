// Zona horaria fija (sin horario de verano desde 2022) para pruebas de días locales / racha.
process.env.TZ = 'America/Mexico_City';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));
