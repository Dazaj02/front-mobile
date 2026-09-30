import { randomUUID } from 'expo-crypto';

// UUID v4 generado en el cliente (idempotencia de sesiones, ids de artículos locales).
export const newId = (): string => randomUUID();
