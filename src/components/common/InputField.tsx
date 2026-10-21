import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View } from 'react-native';
import { Text } from '../../components/common/Text';
import { Colors } from '../../constants/colors';
import { Radius, Spacing, Type } from '../../constants/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * 글자 입력 칸.
 *
 * <p>라벨을 {@code accessibilityLabel} 로 한 번 더 준다. 보이스오버는 옆에 적힌 글자를
 * 입력칸과 묶어주지 않아서, 안 주면 <b>"텍스트 필드"라고만 읽는다.</b>
 *
 * <p>오류 문구는 {@code role="alert"} 로 알린다. 눌렀는데 아무 소리도 안 나면
 * 왜 다음으로 못 넘어가는지 알 수 없다.
 */
export function InputField({ label, error, style, accessibilityLabel, ...props }: InputFieldProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.placeholder}
        autoCapitalize="none"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error}
        {...props}
      />
      {error && (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    ...Type.caption,
    fontFamily: Type.itemTitle.fontFamily,
    color: Colors.dark,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    // 46 → 입력칸은 손가락으로 찍어 커서를 놓는 곳이라 버튼과 같은 기준으로 둔다
    minHeight: 46,
    ...Type.body,
    color: Colors.dark,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.fail,
  },
  error: {
    ...Type.micro,
    color: Colors.fail,
  },
});
