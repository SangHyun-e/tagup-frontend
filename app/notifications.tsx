import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/common/Text';
import { Colors } from '../src/constants/colors';
import { Radius, Spacing, Type } from '../src/constants/theme';
import {
  PushPermission,
  getPushPermission,
  markPushAsked,
  requestPushPermission,
} from '../src/lib/push';

/**
 * 알림을 켜기 전에 왜 필요한지 먼저 설명하는 화면.
 *
 * <p>iOS 권한 창은 <b>한 번 거절하면 앱에서 다시 띄울 수 없다.</b> 전에는 로그인 직후
 * 아무 설명 없이 그 창이 떴다. 무슨 알림인지 모르고 거절한 사람은 내기 제안이 와도
 * 영영 모르게 되고, 되돌리려면 iOS 설정까지 찾아 들어가야 한다.
 *
 * <p>그래서 이 화면을 먼저 보여준다. 여기서 "나중에"를 눌러도 OS 권한은 아직 그대로라
 * 프로필에서 다시 켤 수 있다.
 */
const REASONS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'hand-left-outline',
    title: '내기 제안이 왔을 때',
    body: '상대가 건 내기를 놓치지 않게 알려드려요.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: '내기가 성립됐을 때',
    body: '내가 건 내기를 상대가 받으면 바로 알려드려요.',
  },
  {
    icon: 'baseball-outline',
    title: '내 팀 경기가 시작할 때',
    body: '응원 구단 경기 시작 전에 한 번만 알려드려요.',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [working, setWorking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 설정에서 켜고 돌아올 수 있으니 화면에 들어올 때마다 다시 읽는다
      getPushPermission().then(setPermission);
    }, []),
  );

  const handleAllow = async () => {
    if (working) return;
    setWorking(true);
    try {
      setPermission(await requestPushPermission());
    } finally {
      setWorking(false);
    }
  };

  const handleLater = async () => {
    await markPushAsked();
    router.back();
  };

  const granted = permission === 'granted';
  const blocked = permission === 'denied';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.badge}>
          <Ionicons
            name={granted ? 'notifications' : 'notifications-outline'}
            size={30}
            color={Colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {granted ? '알림을 받고 있어요' : '알림을 받으시겠어요?'}
        </Text>
        <Text style={styles.subtitle}>
          {granted
            ? '내기와 경기 소식을 놓치지 않아요.'
            : '경기 중에 꼭 필요한 것만 보내요. 광고는 보내지 않아요.'}
        </Text>

        <View style={styles.reasons}>
          {REASONS.map((reason) => (
            <View key={reason.title} style={styles.reasonRow}>
              <View style={styles.reasonIcon}>
                <Ionicons name={reason.icon} size={19} color={Colors.primary} />
              </View>
              <View style={styles.reasonText}>
                <Text style={styles.reasonTitle}>{reason.title}</Text>
                <Text style={styles.reasonBody}>{reason.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {granted ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="확인"
          >
            <Text style={styles.primaryButtonText}>확인</Text>
          </TouchableOpacity>
        ) : blocked ? (
          <>
            <Text style={styles.blockedNote}>
              알림이 꺼져 있어요. {Platform.OS === 'ios' ? 'iOS' : '기기'} 설정에서 켤 수 있어요.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="설정 열기"
            >
              <Text style={styles.primaryButtonText}>설정 열기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={handleLater}
              accessibilityRole="button"
              accessibilityLabel="나중에"
            >
              <Text style={styles.laterText}>나중에</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, working && styles.primaryButtonBusy]}
              onPress={handleAllow}
              disabled={working}
              accessibilityRole="button"
              accessibilityLabel="알림 받기"
              accessibilityState={{ disabled: working, busy: working }}
            >
              <Text style={styles.primaryButtonText}>알림 받기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={handleLater}
              accessibilityRole="button"
              accessibilityLabel="나중에 받기"
            >
              <Text style={styles.laterText}>나중에</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  badge: {
    width: 60, height: 60, borderRadius: Radius.xl,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Type.screenTitle, color: Colors.dark },
  subtitle: { ...Type.caption, color: Colors.textSub, marginTop: Spacing.xs },

  reasons: { marginTop: Spacing.xxl, gap: Spacing.lg },
  reasonRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  reasonIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  reasonText: { flex: 1, gap: 2 },
  reasonTitle: { ...Type.itemTitle, color: Colors.dark },
  reasonBody: { ...Type.caption, color: Colors.textMuted },

  footer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, gap: Spacing.sm },
  primaryButton: {
    minHeight: 50, borderRadius: Radius.md, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonBusy: { opacity: 0.6 },
  primaryButtonText: { ...Type.button, color: Colors.white },
  laterButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  laterText: { ...Type.button, color: Colors.textMuted },
  blockedNote: { ...Type.caption, color: Colors.textSub, textAlign: 'center', marginBottom: Spacing.xs },
});
