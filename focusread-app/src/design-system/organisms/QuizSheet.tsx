import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export interface QuizQuestionView {
  question: string;
  options: readonly string[];
  correctIndex: number;
  explanation: string | null;
}

export interface QuizSheetProps {
  quiz: QuizQuestionView;
  onDone: (correct: boolean) => void;
}

// Contenido del quiz; el contenedor (scrim, botón atrás, insets) lo pone SheetTemplate.
export function QuizSheet({ quiz, onDone }: QuizSheetProps) {
  const { colors, spacing, radii, sizes } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === quiz.correctIndex;

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="title" accessibilityRole="header">
        {quiz.question}
      </AppText>
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {quiz.options.map((option, i) => {
          const isRight = answered && i === quiz.correctIndex;
          const isWrong = answered && i === selected && !correct;
          const status = isRight ? 'Correcta' : isWrong ? 'Incorrecta' : '';
          return (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityLabel={status ? `${option}. ${status}` : option}
              accessibilityState={{ checked: selected === i, disabled: answered }}
              disabled={answered}
              onPress={() => setSelected(i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: sizes.touchMin,
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: isRight || isWrong ? borderWidth.thick : borderWidth.thin,
                borderColor: isRight ? colors.state.success : isWrong ? colors.state.danger : colors.border.strong,
                backgroundColor: colors.bg.elevated,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body">{option}</AppText>
              </View>
              {/* El estado no depende solo del color: icono + texto en la etiqueta. */}
              {isRight ? <Icon name="checkmark-circle" color="success" /> : null}
              {isWrong ? <Icon name="close-circle" color="danger" /> : null}
            </Pressable>
          );
        })}
      </View>
      {answered ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <AppText variant="label" color={correct ? 'success' : 'danger'}>
            {correct ? '¡Correcto!' : 'Respuesta incorrecta'}
          </AppText>
          {quiz.explanation ? (
            <AppText variant="body" color="secondary">
              {quiz.explanation}
            </AppText>
          ) : null}
          <Button label="Continuar" onPress={() => onDone(correct)} />
        </View>
      ) : null}
    </View>
  );
}
