import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Colors } from '../../constants/colors';
import { Radius, Spacing, Type } from '../../constants/theme';
import { ChatMessage, LiveRelay } from '../../types';

/**
 * 채팅에 흐르는 실시간 중계 한 줄.
 *
 * <p>서버가 보낸 재료({@code live})로 앱이 그린다. 2026-10-02 이전 메시지에는 재료가 없고
 * 이모지가 박힌 완성 문장만 있으므로, 그때는 {@code content} 를 그대로 출력한다.
 *
 * <p>아웃·세이프를 빨강·초록으로 쓰지 않는다. 초록은 브랜드 색과 부딪히고, 적록색약이면 둘을
 * 구분하기 어렵다. 주황과 파랑은 밝기도 서로 달라 흑백으로 봐도 구분된다.
 */
export function LiveRelayLine({ message }: { message: ChatMessage }) {
  const live = message.live;

  // 옛 메시지 — 재료가 없으니 서버가 만든 문장을 그대로
  if (!live) {
    return (
      <View style={[styles.pill, styles.neutral]}>
        <Text style={styles.text}>{message.content}</Text>
      </View>
    );
  }

  const isResult = message.liveKind === 'AT_BAT_RESULT';
  const tone = isResult ? toneOf(live.result) : NEUTRAL;

  return (
    <View style={styles.group}>
      {live.pitcherChanged && live.pitcher ? (
        <View style={[styles.pill, styles.neutral]}>
          <Ionicons name="swap-horizontal" size={13} color={Colors.textSub} />
          <Text style={styles.text}>투수 교체 — {live.pitcher}</Text>
        </View>
      ) : null}

      <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Ionicons name={tone.icon} size={13} color={tone.fg} />
        <Text style={[styles.text, { color: tone.fg }]}>
          {isResult ? resultText(live) : startText(live)}
        </Text>
      </View>
    </View>
  );
}

const NEUTRAL = {
  bg: Colors.white,
  border: Colors.border,
  fg: Colors.textSub,
  icon: 'baseball-outline' as const,
};

function toneOf(result?: LiveRelay['result']) {
  if (result === 'OUT') {
    return { bg: Colors.outSoft, border: '#F0DBD1', fg: Colors.out, icon: 'close' as const };
  }
  if (result === 'SAFE') {
    return { bg: Colors.safeSoft, border: '#D4E2EF', fg: Colors.safe, icon: 'checkmark' as const };
  }
  return { ...NEUTRAL, icon: 'help-circle-outline' as const };
}

/** "7회초 박민우 타석 · 투수 홍건희" — 없는 값은 빼고 잇는다 */
function startText(live: LiveRelay): string {
  const pitcher = live.pitcher ? `투수 ${live.pitcher}` : '';
  return [[inning(live), live.batter && `${live.batter} 타석`].filter(Boolean).join(' '), pitcher]
    .filter(Boolean)
    .join(' · ');
}

/** "박민우 세이프 · 2점 · 이닝 종료" */
function resultText(live: LiveRelay): string {
  const verdict =
    live.result === 'OUT' ? '아웃' : live.result === 'SAFE' ? '세이프' : '결과 확인 불가';

  return [
    `${live.batter ?? ''} ${verdict}`.trim(),
    live.runsScored ? `${live.runsScored}점` : '',
    live.endedInning ? '이닝 종료' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function inning(live: LiveRelay): string {
  if (live.inning == null) return '';
  return `${live.inning}회${live.half === 'BOTTOM' ? '말' : '초'}`;
}

const styles = StyleSheet.create({
  group: { gap: 6, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  neutral: { backgroundColor: Colors.white, borderColor: Colors.border },
  text: { ...Type.micro, fontSize: 12, color: Colors.textSub },
});

export default LiveRelayLine;
