import { useEffect, type RefObject } from 'react';
import { Keyboard, type ScrollView } from 'react-native';

// Al abrirse el teclado, desplaza el contenido hasta el final para que el botón de enviar y los
// enlaces inferiores queden visibles por encima del teclado.
export function useScrollToEndOnKeyboard(ref: RefObject<ScrollView | null>) {
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      // Se espera un frame: el KeyboardAvoidingView primero acorta el área visible.
      setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => sub.remove();
  }, [ref]);
}
