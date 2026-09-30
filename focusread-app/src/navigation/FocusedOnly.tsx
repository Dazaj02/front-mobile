import React from 'react';
import { useIsFocused } from '@react-navigation/native';

// Monta el contenido solo mientras la pestaña está visible. Así nunca hay más de una
// pestaña montada a la vez; los datos persisten en React Query / SQLite, no en el estado de la vista.
export function FocusedOnly({ children }: { children: React.ReactNode }) {
  return useIsFocused() ? <>{children}</> : null;
}
