import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { useRoomStore } from '../src/store/useRoomStore';
import { Room } from '../src/types';

// 딥링크 tagup://room/{tagCode} 처리 화면
// 앱 진입 시 tagCode로 방에 자동 참여 후 채팅으로 이동
export default function RoomEnterScreen() {
  const { tagCode } = useLocalSearchParams<{ tagCode: string }>();
  const router = useRouter();
  const { appUser } = useAuthStore();
  const { addRoom } = useRoomStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tagCode) {
      router.replace('/(tabs)');
      return;
    }
    // 로그인 상태가 아니면 로그인 화면으로
    if (!appUser) {
      router.replace('/login');
      return;
    }
    joinRoom();
  }, [tagCode, appUser]);

  const joinRoom = async () => {
    try {
      const room = await api.post<Room>('/api/v1/rooms/join', { tagCode });
      addRoom(room);
      router.replace({
        pathname: '/chat/[roomId]',
        params: { roomId: String(room.id), roomName: room.name },
      });
    } catch (e: any) {
      setError(e.message ?? '방 입장에 실패했습니다.');
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorEmoji}>😢</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.sub} onPress={() => router.replace('/(tabs)')}>
          홈으로 돌아가기
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>더그아웃 입장 중…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: Colors.background },
  loadingText: { fontSize: 14, fontWeight: '600', color: Colors.textSub },
  errorEmoji: { fontSize: 40 },
  errorText: { fontSize: 14, fontWeight: '700', color: Colors.fail, textAlign: 'center', paddingHorizontal: 32 },
  sub: { fontSize: 13, color: Colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
