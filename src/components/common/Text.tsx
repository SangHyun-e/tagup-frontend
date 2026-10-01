import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';
import { Font } from '../../constants/theme';

/**
 * Pretendard 를 쓰는 Text.
 *
 * <p><b>왜 감싸는가</b> — 안드로이드는 커스텀 폰트에 {@code fontWeight} 를 적용하지 못한다.
 * 굵기마다 파일이 따로 있고 {@code fontFamily} 이름으로 골라야 한다. 그런데 기존 화면은
 * 전부 {@code fontWeight: '700'} 식으로 쓰여 있어서, 그대로 두면 안드로이드에서 굵기가 통째로
 * 무시된다.
 *
 * <p>그래서 이 컴포넌트가 스타일의 {@code fontWeight} 를 읽어 알맞은 Pretendard 파일로 바꿔준다.
 * 화면은 {@code react-native} 대신 여기서 {@code Text} 를 가져오기만 하면 된다 — 나머지 코드는
 * 손대지 않아도 되고, 새로 쓰는 화면은 {@code Type} 토큰을 쓰면 된다.
 */
export function familyForWeight(weight?: TextStyle['fontWeight']): string {
  const numeric = typeof weight === 'string' ? parseInt(weight, 10) : weight;

  if (weight === 'bold') return Font.bold;
  if (!numeric || Number.isNaN(numeric)) return Font.regular;
  if (numeric >= 800) return Font.extraBold;
  if (numeric >= 600) return Font.bold;
  return Font.regular;
}

export type TextProps = RNTextProps;

export function Text({ style, ...rest }: TextProps) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;

  // 이미 Pretendard 를 지정했으면 (Type 토큰을 쓴 경우) 건드리지 않는다
  if (flattened?.fontFamily) {
    return <RNText style={style} {...rest} />;
  }

  return (
    <RNText
      style={[{ fontFamily: familyForWeight(flattened?.fontWeight) }, style, { fontWeight: undefined }]}
      {...rest}
    />
  );
}

export default Text;
