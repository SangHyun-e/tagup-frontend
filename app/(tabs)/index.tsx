import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

const AVATAR_COLORS = ['#4C82F7', '#FF6FA5', '#34C759', '#5B8DEF', '#FF9F0A', '#AF52DE', '#FC4E00'];
function getRoomColor(name: string): string {
  let sum = 0;
  for (const c of name) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getTeamEmoji(shortName: string): string {
  return KBO_TEAMS.find((t) => t.shortName === shortName)?.emoji ?? '⚾';
}

function HeroGameCard({ game, myTeamShortName }: { game: Game; myTeamShortName?: string }) {
  const live = game.status === 'LIVE';
  const ended = game.status === 'FINAL' || game.status === 'FINISHED';
  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;

  const myTeamIsAway = game.awayTeam.shortName === myTeamShortName;
  const myTeamIsHome = game.homeTeam.shortName === myTeamShortName;
  const hasMyTeam = myTeamIsAway || myTeamIsHome;

  const myTeam = myTeamIsAway ? game.awayTeam : game.homeTeam;
  const oppTeam = myTeamIsAway ? game.homeTeam : game.awayTeam;
  const myScore = myTeamIsAway ? awayScore : homeScore;
  const oppScore = myTeamIsAway ? homeScore : awayScore;
  const myWin = ended && myScore > oppScore;

  const time = ((game as any).gameTime ?? game.startTime ?? '').slice(0, 5);

  return (
    <View style={[styles.heroCard, live && styles.heroCardLive]}>
      {/* 상단 상태 */}
      <View style={styles.heroTop}>
        {live ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE · {game.inning != null ? `${game.inning}이닝` : ''}</Text>
          </View>
        ) : ended ? (
          <View style={styles.endedPill}>
            <Text style={styles.endedPillText}>경기 종료</Text>
          </View>
        ) : (
          <View style={styles.prePill}>
            <Text style={styles.prePillText}>오늘 {time}</Text>
          </View>
        )}
        <Text style={styles.heroVenue}>{game.stadium}</Text>
      </View>

      {/* 팀 & 스코어 */}
      <View style={styles.heroTeams}>
        {/* 원정 */}
        <View style={styles.heroTeam}>
          <View style={[styles.heroTeamBadge, hasMyTeam && myTeamIsAway && styles.heroTeamBadgeMy]}>
            <Text style={[styles.heroTeamBadgeText, hasMyTeam && myTeamIsAway && styles.heroTeamBadgeTextMy]}>
              {game.awayTeam.shortName}
            </Text>
          </View>
          <Text style={styles.heroEmoji}>{game.awayTeam.emoji ?? getTeamEmoji(game.awayTeam.shortName)}</Text>
          {hasMyTeam && myTeamIsAway && (
            <View style={styles.myTeamTag}><Text style={styles.myTeamTagText}>내 팀</Text></View>
          )}
        </View>

        {/* 스코어 or VS */}
        <View style={styles.heroCenter}>
          {(live || ended) ? (
            <View style={styles.heroScoreRow}>
              <Text style={[styles.heroScoreNum, myTeamIsAway && myWin && styles.heroScoreWin,
                !myTeamIsAway && !myWin && ended && styles.heroScoreLose]}>
                {awayScore}
              </Text>
              <Text style={styles.heroScoreSep}>:</Text>
              <Text style={[styles.heroScoreNum, myTeamIsHome && myWin && styles.heroScoreWin,
                !myTeamIsHome && !myWin && ended && styles.heroScoreLose]}>
                {homeScore}
              </Text>
            </View>
          ) : (
            <Text style={styles.heroVS}>VS</Text>
          )}
        </View>

        {/* 홈 */}
        <View style={styles.heroTeam}>
          <View style={[styles.heroTeamBadge, hasMyTeam && myTeamIsHome && styles.heroTeamBadgeMy]}>
            <Text style={[styles.heroTeamBadgeText, hasMyTeam && myTeamIsHome && styles.heroTeamBadgeTextMy]}>
              {game.homeTeam.shortName}
            </Text>
          </View>
          <Text style={styles.heroEmoji}>{game.homeTeam.emoji ?? getTeamEmoji(game.homeTeam.shortName)}</Text>
          {hasMyTeam && myTeamIsHome && (
            <View style={styles.myTeamTag}><Text style={styles.myTeamTagText}>내 팀</Text></View>
          )}
        </View>
      </View>
    </View>
  );
}

function RoomListItem({ room, liveGameIds, onPress }: { room: Room; liveGameIds: Set<number>; onPress: () => void }) {
  const isLive = room.gameId != null && liveGameIds.has(room.gameId);
  const color = getRoomColor(room.name);
  const initial = room.name.slice(0, 1);

  return (
    <TouchableOpacity style={styles.roomItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.roomAvatarWrap}>
        <View style={[styles.roomAvatar, { backgroundColor: color }]}>
          <Text style={styles.roomAvatarText}>{initial}</Text>
        </View>
        {isLive && (
          <View style={styles.roomLiveDot}>
            <Text style={styles.roomLiveDotText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.roomItemInfo}>
        <View style={styles.roomItemRow}>
          <Text style={styles.roomItemName} numberOfLines={1}>{room.name}</Text>
          <Text style={styles.roomItemMeta}>{room.memberCount}</Text>
        </View>
        <Text style={styles.roomItemSub} numberOfLines={1}>
          태그코드 {room.tagCode}
        </Text>
      </View>
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

  const myTeamShortName = appUser?.team?.shortName;
  const liveGameIds = new Set(todayGames.filter((g) => g.status === 'LIVE').map((g) => g.id));

  // 내 팀 경기를 맨 앞으로
  const sortedGames = myTeamShortName
    ? [...todayGames].sort((a) =>
        a.awayTeam.shortName === myTeamShortName || a.homeTeam.shortName === myTeamShortName ? -1 : 1
      )
    : todayGames;

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

  useFocusEffect(useCallback(() => { fetchAll(true); }, [fetchAll]));

  const handleLogout = async () => {
    await signOut(auth);
    reset();
    router.replace('/login');
  };

  const closeModal = () => { setModal(null); setRoomName(''); setTagCode(''); };

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
    } finally { setSubmitting(false); }
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
      Alert.alert('오류', e.message ?? '태그코드를 확인해주세요.');
    } finally { setSubmitting(false); }
  };

  const navigateToChat = (room: Room) =>
    router.push({ pathname: '/chat/[roomId]', params: { roomId: String(room.id), roomName: room.name } });

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LogoBubble width={26} height={26} />
          <Text style={styles.headerTitle}>태그업</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll()} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사말 */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {appUser?.team?.emoji ? `${appUser.team.emoji} ` : ''}안녕하세요,{' '}
            <Text style={styles.greetingName}>{appUser?.nickname ?? '야구팬'}</Text>님!
          </Text>
          <Text style={styles.greetingSub}>오늘도 콜?</Text>
        </View>

        {/* 오늘의 경기 */}
        {sortedGames.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>오늘의 경기</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameScroll}>
              {sortedGames.map((g) => (
                <HeroGameCard key={g.id} game={g} myTeamShortName={myTeamShortName} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 내 더그아웃 */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>내 더그아웃</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setModal('create')}>
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addButtonText}>태그업 하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagCodeRow}>
            <TouchableOpacity style={styles.tagCodeBtn} onPress={() => setModal('join')}>
              <Ionicons name="key-outline" size={15} color={Colors.textSub} />
              <Text style={styles.tagCodeBtnText}>태그코드로 입장</Text>
            </TouchableOpacity>
          </View>

          {rooms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚾</Text>
              <Text style={styles.emptyText}>참여 중인 더그아웃이 없어요</Text>
              <Text style={styles.emptySubtext}>태그업 하기로 새 더그아웃을 만들어보세요!</Text>
            </View>
          ) : (
            <View style={styles.roomList}>
              {rooms.map((room, i) => (
                <React.Fragment key={room.id}>
                  <RoomListItem room={room} liveGameIds={liveGameIds} onPress={() => navigateToChat(room)} />
                  {i < rooms.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 방 만들기 모달 */}
      <Modal visible={modal === 'create'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
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
                {submitting ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.modalConfirmText}>만들기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 태그코드 입장 모달 */}
      <Modal visible={modal === 'join'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
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
                {submitting ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.modalConfirmText}>입장</Text>}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.dark },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingBottom: 60, gap: 24, paddingTop: 20 },

  greetingRow: { paddingHorizontal: 20, gap: 2 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.dark },
  greetingName: { fontWeight: '900' },
  greetingSub: { fontSize: 13, color: Colors.textSub, fontWeight: '600', marginTop: 2 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },

  // 오늘의 경기
  gameScroll: { paddingHorizontal: 20, gap: 12 },
  heroCard: {
    width: 220, backgroundColor: Colors.white ?? '#fff',
    borderRadius: 24, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroCardLive: { borderColor: Colors.fail },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16181D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#FF3B30' },
  livePillText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  prePill: {
    backgroundColor: `${Colors.primary}18`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  prePillText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  endedPill: {
    backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  endedPillText: { fontSize: 11, fontWeight: '700', color: Colors.textSub },
  heroVenue: { fontSize: 11, fontWeight: '700', color: Colors.placeholder },

  heroTeams: { flexDirection: 'row', alignItems: 'center' },
  heroTeam: { flex: 1, alignItems: 'center', gap: 6 },
  heroTeamBadge: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  heroTeamBadgeMy: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  heroTeamBadgeText: { fontSize: 14, fontWeight: '900', color: Colors.textSub },
  heroTeamBadgeTextMy: { color: '#fff' },
  heroEmoji: { fontSize: 22 },
  myTeamTag: {
    backgroundColor: '#16181D', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  myTeamTagText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  heroCenter: { flex: 0, alignItems: 'center', paddingHorizontal: 6 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroScoreNum: { fontSize: 36, fontWeight: '900', color: Colors.dark, minWidth: 32, textAlign: 'center' },
  heroScoreWin: { color: Colors.primary },
  heroScoreLose: { color: Colors.placeholder },
  heroScoreSep: { fontSize: 20, color: Colors.border, marginTop: 4 },
  heroVS: { fontSize: 22, fontWeight: '900', color: Colors.border },

  // 내 더그아웃
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.primary}14`, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
  },
  addButtonText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  tagCodeRow: { paddingHorizontal: 20, marginBottom: 12 },
  tagCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  tagCodeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },

  roomList: {
    marginHorizontal: 20, backgroundColor: Colors.background,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  roomItem: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  roomAvatarWrap: { position: 'relative', flexShrink: 0 },
  roomAvatar: {
    width: 50, height: 50, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  roomAvatarText: { fontSize: 19, fontWeight: '900', color: '#fff' },
  roomLiveDot: {
    position: 'absolute', bottom: -3, right: -3,
    backgroundColor: Colors.fail, paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 999, borderWidth: 2, borderColor: Colors.background,
  },
  roomLiveDotText: { fontSize: 8, fontWeight: '900', color: '#fff' },
  roomItemInfo: { flex: 1, gap: 3 },
  roomItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomItemName: { fontSize: 15, fontWeight: '800', color: Colors.dark, flex: 1 },
  roomItemMeta: { fontSize: 11, fontWeight: '700', color: Colors.placeholder },
  roomItemSub: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 78 },

  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  emptySubtext: { fontSize: 12, color: Colors.textSub, textAlign: 'center' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, gap: 16, paddingBottom: 40,
  },
  modalHandle: { width: 42, height: 5, borderRadius: 999, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: Colors.dark,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSub },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmDisabled: { backgroundColor: Colors.placeholder },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
