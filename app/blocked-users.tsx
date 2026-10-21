import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/components/common/Text';
import { Colors } from '../src/constants/colors';
import { Radius, Spacing, Type } from '../src/constants/theme';
import { api } from '../src/lib/api';
import { BlockedUser } from '../src/types';

/**
 * 차단한 사용자 목록.
 *
 * <p>차단은 신고 화면에서 걸리고, 푸는 곳은 여기뿐이다. 애플 심사 지침 1.2는 차단 수단을
 * 요구하는데, <b>풀 수단이 없으면 실수로 차단한 사람을 영영 못 되돌린다.</b>
 */
export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    try {
      const data = await api.get<BlockedUser[]>('/api/v1/users/me/blocks');
      setBlocked(data ?? []);
    } catch {
      setBlocked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchBlocked(); }, [fetchBlocked]));

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert('차단을 풀까요?', `${user.nickname}님의 메시지가 다시 보여요.`, [
      { text: '아니요', style: 'cancel' },
      {
        text: '차단 해제',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/users/me/blocks/${user.userId}`);
            setBlocked((prev) => prev.filter((b) => b.userId !== user.userId));
          } catch (e: any) {
            Alert.alert('해제하지 못했어요', e?.message ?? '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">차단한 사용자</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : blocked.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="person-remove-outline" size={44} color={Colors.placeholder} />
          <Text style={styles.emptyText}>차단한 사람이 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.nickname.slice(0, 1)}</Text>
              </View>
              <Text style={styles.nickname}>{item.nickname}</Text>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`${item.nickname} 차단 해제`}
              >
                <Text style={styles.unblockText}>해제</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.sectionTitle, flex: 1, textAlign: 'center', color: Colors.dark },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { ...Type.body, color: Colors.textMuted },

  list: { padding: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
  },
  avatar: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Type.itemTitle, color: Colors.textSub },
  nickname: { ...Type.itemTitle, flex: 1, color: Colors.dark },
  unblockButton: {
    height: 36, paddingHorizontal: 16, justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radius.md,
  },
  unblockText: { ...Type.button, fontSize: 13, color: Colors.textSub },
});
