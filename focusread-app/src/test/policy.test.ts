import fs from 'fs';
import path from 'path';

// Políticas del plan verificadas sobre el código fuente.
const SRC = path.join(__dirname, '..');

function files(dir: string, exts = ['.ts', '.tsx']): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p, exts);
    return exts.some((x) => p.endsWith(x)) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}
const read = (p: string) => fs.readFileSync(p, 'utf8');
const rel = (p: string) => path.relative(SRC, p).replace(/\\/g, '/');

describe('políticas del plan', () => {
  it('las pantallas (features) no usan StyleSheet.create ni estilos con valores literales de color', () => {
    const offenders = files(path.join(SRC, 'features')).filter((p) => /StyleSheet\.create/.test(read(p)) || /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(read(p)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('no hay colores literales fuera de tokens/ (design-system, features, navigation, app)', () => {
    const dirs = ['design-system', 'features', 'navigation', 'app'].map((d) => path.join(SRC, d));
    const offenders = dirs
      .flatMap((d) => files(d))
      .filter((p) => !rel(p).startsWith('design-system/tokens/'))
      .filter((p) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(read(p)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('ninguna llamada directa a proveedores de IA ni secretos en el código', () => {
    const all = files(SRC);
    const bad = all.filter((p) => /api\.deepseek\.com|api\.openai\.com|generativelanguage|api\.groq\.com|openrouter\.ai\/api/i.test(read(p)));
    expect(bad.map(rel)).toEqual([]);
    const keys = all.filter((p) => /sk-[A-Za-z0-9]{20,}/.test(read(p)));
    expect(keys.map(rel)).toEqual([]);
  });

  it('la app nunca inserta artículos, dosis ni quiz directamente (solo la API o el gateway mock)', () => {
    const callers = files(SRC).filter((p) => /\.save\(|\.insert\(/.test(read(p)));
    // Permitidos: el gateway mock y la siembra de ejemplos del modo mock (useLoadExamples).
    expect(callers.map(rel).sort()).toEqual(['data/mock/LocalChunkerGateway.ts', 'features/library/useLibraryData.ts']);
  });

  it('no queda código eliminado: binaurales, karaoke, voces "persona", fatiga ahorrada', () => {
    const bad = files(SRC).filter((p) => /binaural|karaoke|fatiga cognitiva|savedHoursCognitive|Elena|Marcos|Mateo/.test(read(p)));
    expect(bad.map(rel)).toEqual([]);
  });

  it('el código de producción no usa console.* (solo el logger)', () => {
    const bad = files(SRC).filter((p) => rel(p) !== 'lib/logger.ts' && /\bconsole\./.test(read(p)));
    expect(bad.map(rel)).toEqual([]);
  });

  it('AsyncStorage solo lo importan la sesión cifrada y la sesión mock (nunca las keys BYOK)', () => {
    const importers = files(SRC).filter((p) => /from '@react-native-async-storage\/async-storage'/.test(read(p)));
    expect(importers.map(rel).sort()).toEqual(['data/mock/MockAuthRepository.ts', 'data/secure/LargeSecureStore.ts']);
  });
});
