// Zona horaria fija (sin horario de verano desde 2022) para pruebas de días locales / racha.
process.env.TZ = 'America/Mexico_City';

require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// BackHandler con la semántica de Android: el último listener registrado responde primero;
// si ninguno devuelve true se cierra la app. `mockPressBack` simula el botón atrás.
jest.mock('react-native/Libraries/Utilities/BackHandler', () => {
  const listeners = [];
  const BackHandler = {
    addEventListener: (_event, handler) => {
      listeners.push(handler);
      return {
        remove: () => {
          const i = listeners.indexOf(handler);
          if (i >= 0) listeners.splice(i, 1);
        },
      };
    },
    exitApp: jest.fn(),
    mockPressBack: () => {
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i]()) return;
      }
      BackHandler.exitApp();
    },
  };
  return { __esModule: true, default: BackHandler, ...BackHandler };
});

// expo-linking necesita el manifiesto nativo para conocer el scheme; en Jest se simula.
jest.mock('expo-linking', () => ({
  createURL: (path, options) => {
    const query = options && options.queryParams ? new URLSearchParams(options.queryParams).toString() : '';
    return `focusread://${String(path).replace(/^\//, '')}${query ? `?${query}` : ''}`;
  },
  openURL: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));
