import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Text } from '../../components/common/Text';
import { Colors } from '../../constants/colors';
import { Radius, Type } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** 글자만으로 뜻이 분명하지 않을 때만 따로 준다 (예: "변경" → "응원 구단 변경") */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      // 눌림·로딩 상태를 보이스오버가 읽어야 한다. 로딩 중에는 글자가 사라져
      // 화면만 보고는 알 수 있지만 소리로는 알 길이 없다
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.dark} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // 손가락이 닿는 최소 크기. 애플 HIG·안드로이드 모두 44pt 를 기준으로 본다
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.surface,
  },
  outline: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...Type.button,
  },
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.dark,
  },
  outlineText: {
    color: Colors.primary,
  },
});
