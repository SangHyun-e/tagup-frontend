import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Colors } from '../../constants/colors';
import { Radius, Spacing, Type } from '../../constants/theme';
import { ChatMessage, ReportReason } from '../../types';

/**
 * 메시지 신고.
 *
 * <p>신고할 때 <b>메시지 내용을 함께 보낸다.</b> 메시지는 Firestore에 있어 서버가 읽을 수 없고,
 * 신고 뒤 상대가 지우면 운영자가 볼 근거가 사라지기 때문이다.
 *
 * <p>신고와 차단을 한 화면에 둔다. 불쾌한 메시지를 본 사람은 보통 둘 다 하고 싶어 하는데,
 * 신고하고 나서 차단하러 다시 찾아 들어가게 만들면 그 사이에 또 메시지를 보게 된다.
 */
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'ABUSE', label: '욕설·비방' },
  { value: 'SEXUAL', label: '선정적인 내용' },
  { value: 'SPAM', label: '광고·도배' },
  { value: 'MONEY_BETTING', label: '돈 내기 유도' },
  { value: 'ETC', label: '기타' },
];

interface Props {
  message: ChatMessage | null;
  onClose: () => void;
  onReport: (reason: ReportReason, alsoBlock: boolean) => Promise<void>;
}

export function ReportSheet({ message, onClose, onReport }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async (reason: ReportReason, alsoBlock: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onReport(reason, alsoBlock);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!message} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="닫기"
      >
        <TouchableOpacity style={styles.sheet} activeOpacity={1} accessibilityViewIsModal>
          <View style={styles.handle} />

          <Text style={styles.title} accessibilityRole="header">
            {message?.senderNickname}님을 신고할까요?
          </Text>
          {message ? (
            <Text style={styles.quoted} numberOfLines={2}>"{message.content}"</Text>
          ) : null}

          <Text style={styles.sectionLabel}>어떤 문제인가요?</Text>
          <View style={styles.reasons}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={styles.reasonRow}
                onPress={() => submit(reason.value, false)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={`${reason.label}(으)로 신고하기`}
                accessibilityState={{ disabled: submitting, busy: submitting }}
              >
                <Text style={styles.reasonText}>{reason.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.blockButton}
            onPress={() => submit('ABUSE', true)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="신고하고 차단하기"
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            <Ionicons name="person-remove-outline" size={18} color={Colors.out} />
            <Text style={styles.blockText}>신고하고 차단하기</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            차단하면 이 사람의 메시지가 보이지 않아요. 프로필에서 다시 풀 수 있어요.
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 34, gap: Spacing.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm,
  },
  title: { ...Type.sectionTitle, color: Colors.dark },
  quoted: {
    ...Type.caption, color: Colors.textMuted,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
  },
  sectionLabel: { ...Type.micro, color: Colors.textMuted, marginTop: Spacing.xs },
  reasons: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  reasonText: { ...Type.body, color: Colors.dark },
  blockButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.out,
  },
  blockText: { ...Type.button, color: Colors.out },
  note: { ...Type.micro, color: Colors.textMuted, textAlign: 'center' },
});

export default ReportSheet;
