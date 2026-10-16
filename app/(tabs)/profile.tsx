import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../src/components/common/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { unregisterPushToken } from '../../src/lib/push';
import { auth } from '../../src/lib/firebase';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors } from '../../src/constants/colors';
import { TeamEmblem } from '../../src/components/emblems/TeamEmblem';

export default function ProfileScreen() {
  const router = useRouter();
  const { appUser, reset } = useAuthStore();

  const myTeam = appUser?.team ?? null;

  const handleLogout = async () => {
    await unregisterPushToken();
    await signOut(auth);
    reset();
    router.replace('/login');
  };

  /**
   * 계정 삭제. 되돌릴 수 없으므로 두 번 묻는다.
   *
   * 기록에는 "탈퇴한 사용자"로 남는다 — 함께 건 내기가 상대방 쪽에서 깨지지 않게 하기 위해서다.
   * 그 사실을 미리 알려야 나중에 "왜 내 이름이 남아 있냐"는 오해가 없다.
   */
  const handleWithdraw = () => {
    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '계정과 개인정보가 삭제되고 되돌릴 수 없어요.\n' +
        '함께 건 내기 기록에는 "탈퇴한 사용자"로 남아요.',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/v1/users/me');
              await signOut(auth);
              reset();
              router.replace('/login');
            } catch (e: any) {
              Alert.alert('탈퇴하지 못했어요', e?.message ?? '잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 프로필</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="person-circle" size={64} color={Colors.textSub} />
          <Text style={styles.nickname}>{appUser?.nickname ?? '-'}</Text>
          <Text style={styles.email}>{appUser?.email ?? '-'}</Text>
        </View>

        <View style={styles.teamRow}>
          {myTeam ? (
            <>
              <TeamEmblem shortName={myTeam.shortName} size={56} />
              <Text style={styles.teamName}>{myTeam.name}</Text>
            </>
          ) : (
            <>
              <View style={styles.emblemPlaceholder}>
                <Ionicons name="shield-outline" size={26} color={Colors.placeholder} />
              </View>
              <Text style={[styles.teamName, { color: Colors.textSub }]}>구단 미설정</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => router.push('/team-select')}
          >
            <Text style={styles.changeButtonText}>{myTeam ? '변경' : '설정'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/blocked-users')}
          accessibilityRole="button"
        >
          <Ionicons name="person-remove-outline" size={20} color={Colors.textSub} />
          <Text style={styles.menuText}>차단한 사용자</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomArea}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={handleWithdraw}
          accessibilityRole="button"
          accessibilityLabel="계정 삭제"
        >
          <Text style={styles.withdrawText}>계정 삭제</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  email: {
    fontSize: 13,
    color: Colors.textSub,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  emblemPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  emblemPlaceholderText: { fontSize: 26 },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  changeButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
    backgroundColor: Colors.white,
  },
  menuText: { flex: 1, fontSize: 14.5, fontWeight: '700', color: Colors.dark },
  bottomArea: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  withdrawButton: { alignItems: 'center', paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  withdrawText: { fontSize: 13, color: Colors.placeholder },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSub,
  },
});
