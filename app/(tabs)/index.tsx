import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import LogoBubble from '../../assets/images/tagup_logo_bubble.svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { api } from '../../src/lib/api';
import { Colors } from '../../src/constants/colors';
import { KBO_TEAMS } from '../../src/constants/teams';
import { Room, Game } from '../../src/types';

type ModalType = 'create' | 'join' | null;

function getTeamEmoji(shortName: string): string {
  return KBO_TEAMS.find((t) => t.shortName === shortName)?.emoji ?? '⚾';
}

function TodayGameCard({ game }: { game: Game }) {
  const live = game.status === 'LIVE';
  const ended = game.status === 'FINAL' || game.status === 'FINISHED';
  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;
  const awayWin = ended && awayScore > homeScore;
  const homeWin = ended && homeScore > awayScore;

  return (
    <View style={[styles.gameCard, live && styles.gameCardLive]}>
      {live && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      <View style={styles.gameTeams}>
        <View style={styles.gameTeam}>
          <Text style={styles.gameEmoji}>{game.awayTeam.emoji ?? getTeamEmoji(game.awayTeam.shortName)}</Text>
          <Text style={[styles.gameShortName, awayWin && styles.gameWinner]}>{game.awayTeam.shortName}</Text>
        </View>
        <View style={styles.gameCenter}>
          {(live || ended) ? (
            <Text style={styles.gameScore}>
              <Text style={awayWin ? styles.gameWinner : undefined}>{awayScore}</Text>
              <Text style={styles.gameScoreSep}> : </Text>
              <Text style={homeWin ? styles.gameWinner : undefined}>{homeScore}</Text>
            </Text>
          ) : (
            <Text style={styles.gameTime}>
              {((game as any).gameTime ?? game.startTime ?? '').slice(0, 5)}
            </Text>
          )}
          <Text style={styles.gameStadium}>{game.stadium}</Text>
        </View>
        <View style={styles.gameTeam}>
          <Text style={styles.gameEmoji}>{game.homeTeam.emoji ?? getTeamEmoji(game.homeTeam.shortName)}</Text>
          <Text style={[styles.gameShortName, homeWin && styles.gameWinner]}>{game.homeTeam.shortName}</Text>
        </View>
      </View>
    </View>
  );
}

function RoomCard({ room, liveGameIds, onPress }: { room: Room; liveGameIds: Set<number>; onPress: () => void }) {
  const isLive = room.gameId != null && liveGameIds.has(room.gameId);
  return (
    <TouchableOpacity style={styles.roomCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.roomIcon}>
        <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
      </View>
      <View style={styles.roomInfo}>
        <View style={styles.roomNameRow}>
          <Text style={styles.roomName}>{room.name}</Text>
          {isLive && (
            <View style={styles.roomLiveBadge}>
              <Text style={styles.roomLiveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.roomMeta}>태그코드: {room.tagCode} · {room.memberCount}명</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} />
    </TouchableOpacity>
  );
}

export default function MainHomeScreen() {
  const router = useRouter();
  const { appUser, reset } = useAuthStore();
  const { rooms, setRooms, addRoom } = useRoomStore();

  const [todayGames, setTodayGames] = useState<Game[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [roomName, setRoomName] = useState('');
  const [tagCode, setTagCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const liveGameIds = new Set(
    todayGames.filter((g) => g.status === 'LIVE').map((g) => g.id),
  );

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [roomData, gameData] = await Promise.all([
        api.get<Room[]>('/api/v1/rooms').catch(() => [] as Room[]),
        api.get<Game[]>('/api/v1/games/today').catch(() => [] as Game[]),
      ]);
      setRooms(roomData ?? []);
      setTodayGames(gameData ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [setRooms]);

  useFocusEffect(
    useCallback(() => {
      fetchAll(true);
    }, [fetchAll]),
  );

  const handleLogout = async () => {
    await signOut(auth);
    reset();
    router.replace('/login');
  };

  const closeModal = () => {
    setModal(null);
    setRoomName('');
    setTagCode('');
  };

  const handleCreateRoom = async () => {
    const name = roomName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      const room = await api.post<Room>('/api/v1/rooms', { name });
      addRoom(room);
      closeModal();
      router.push({ pathname: '/chat/[roomId]', params: { roomId: String(room.id), roomName: room.name } });
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '방 생성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = tagCode.trim().toUpperCase();
    if (!code) return;
    setSubmitting(true);
    try {
      const room = await api.post<Room>('/api/v1/rooms/join', { tagCode: code });
      addRoom(room);
      closeModal();
      router.push({ pathname: '/chat/[roomId]', params: { roomId: String(room.id), roomName: room.name } });
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '입장에 실패했어요. 태그코드를 확인해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToChat = (room: Room) => {
    router.push({ pathname: '/chat/[roomId]', params: { roomId: String(room.id), roomName: room.name } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LogoBubble width={28} height={28} />
          <Text style={styles.headerTitle}>태그업</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll()} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.greeting}>
          안녕하세요, {appUser?.nickname ?? '야구팬'}
          {appUser?.team?.emoji ? ` ${appUser.team.emoji}` : ''}님!
        </Text>

        {/* 오늘의 경기 */}
        {todayGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚾ 오늘의 경기</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameList}>
              {todayGames.map((g) => <TodayGameCard key={g.id} game={g} />)}
            </ScrollView>
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => setModal('create')}
          >
            <Ionicons name="flash" size={18} color={Colors.white} />
            <Text style={styles.primaryButtonText}>태그업 하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setModal('join')}
          >
            <Text style={styles.secondaryButtonText}>태그코드 입장</Text>
          </TouchableOpacity>
        </View>

        {/* 내 더그아웃 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 더그아웃</Text>
          <Text style={styles.sectionCount}>{rooms.length}</Text>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⚾</Text>
            <Text style={styles.emptyText}>아직 참여 중인 더그아웃이 없어요.</Text>
            <Text style={styles.emptySubtext}>태그업 하기로 새 더그아웃을 만들어보세요!</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} liveGameIds={liveGameIds} onPress={() => navigateToChat(room)} />
          ))
        )}
      </ScrollView>

      {/* 방 만들기 모달 */}
      <Modal visible={modal === 'create'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>새 더그아웃 만들기</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="더그아웃 이름"
              placeholderTextColor={Colors.placeholder}
              value={roomName}
              onChangeText={setRoomName}
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!roomName.trim() || submitting) && styles.modalConfirmDisabled]}
                onPress={handleCreateRoom}
                disabled={!roomName.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>만들기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 태그코드 입장 모달 */}
      <Modal visible={modal === 'join'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>태그코드로 입장</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="태그코드 6자리"
              placeholderTextColor={Colors.placeholder}
              value={tagCode}
              onChangeText={setTagCode}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!tagCode.trim() || submitting) && styles.modalConfirmDisabled]}
                onPress={handleJoinRoom}
                disabled={!tagCode.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>입장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.dark },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  greeting: { fontSize: 18, fontWeight: '800', color: Colors.dark },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  sectionCount: {
    fontSize: 12, fontWeight: '700', color: Colors.white,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
  },

  // 오늘의 경기 카드
  gameList: { gap: 10, paddingRight: 4 },
  gameCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  gameCardLive: { borderColor: Colors.fail },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.fail,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  gameTeams: { flexDirection: 'row', alignItems: 'center' },
  gameTeam: { flex: 1, alignItems: 'center', gap: 3 },
  gameEmoji: { fontSize: 24 },
  gameShortName: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  gameCenter: { flex: 1, alignItems: 'center', gap: 2 },
  gameScore: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  gameScoreSep: { fontSize: 14, color: Colors.placeholder },
  gameWinner: { fontWeight: '800', color: Colors.dark },
  gameTime: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  gameStadium: { fontSize: 10, color: Colors.textSub },

  // 액션 버튼
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 6,
  },
  primaryButton: { backgroundColor: Colors.primary },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  secondaryButton: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: Colors.dark },

  // 더그아웃 카드
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 14, gap: 12,
  },
  roomIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  roomInfo: { flex: 1, gap: 3 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  roomMeta: { fontSize: 12, color: Colors.textSub },
  roomLiveBadge: {
    backgroundColor: Colors.fail, borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  roomLiveBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.white },

  // 빈 상태
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  emptySubtext: { fontSize: 12, color: Colors.textSub, textAlign: 'center' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 16, paddingBottom: 40,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.dark,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSub },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmDisabled: { backgroundColor: Colors.placeholder },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
