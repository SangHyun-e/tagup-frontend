import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { useBetStore } from '../../src/store/useBetStore';
import { Colors } from '../../src/constants/colors';
import { ChatMessage, Bet } from '../../src/types';
import { BetSheet } from '../../src/components/BetSheet';
import { api } from '../../src/lib/api';
import { TeamEmblem } from '../../src/components/emblems/TeamEmblem';

const AVATAR_COLORS = ['#4C82F7', '#FF6FA5', '#34C759', '#5B8DEF', '#FF9F0A', '#AF52DE', '#FC4E00', '#00BCD4'];
function getAvatarColor(uid: string): string {
  let sum = 0;
  for (const c of uid) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatDate(str: string): string {
  return new Date(str).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

type TabType = 'chat' | 'bet';

const BET_STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중',
  ACCEPTED: '수락됨',
  FINISHED: '정산 완료',
  CANCELLED: '취소됨',
};

const BET_STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.primary,
  ACCEPTED: '#4C82F7',
  FINISHED: Colors.dark,
  CANCELLED: Colors.placeholder,
};

function BetCard({
  bet,
  myUserId,
  onAccept,
  onCancel,
}: {
  bet: Bet;
  myUserId: number | undefined;
  onAccept: (betId: number) => void;
  onCancel: (betId: number) => void;
}) {
  const isProposer = bet.proposer.id === myUserId;
  const isPending = bet.status === 'PENDING';
  const isFinished = bet.status === 'FINISHED';

  // proposerResult는 제안자 기준 → 승자 닉네임으로 변환해 표시
  const resultLabel =
    bet.proposerResult === 'DRAW'
      ? '🤝 무승부'
      : bet.proposerResult === 'WIN'
        ? `🏆 ${bet.proposer.nickname} 승`
        : bet.proposerResult === 'LOSE'
          ? `🏆 ${bet.receiver.nickname} 승`
          : null;
  const iWon =
    (bet.proposerResult === 'WIN' && isProposer) ||
    (bet.proposerResult === 'LOSE' && !isProposer);

  return (
    <View style={betStyles.card}>
      {/* 상태 배지 */}
      <View style={betStyles.header}>
        <View style={[betStyles.statusBadge, { backgroundColor: `${BET_STATUS_COLOR[bet.status]}18` }]}>
          <Text style={[betStyles.statusText, { color: BET_STATUS_COLOR[bet.status] }]}>
            {BET_STATUS_LABEL[bet.status]}
          </Text>
        </View>
        {isFinished && resultLabel && (
          <View style={[betStyles.resultBadge, iWon ? betStyles.winBadge : betStyles.loseBadge]}>
            <Text style={betStyles.resultText}>{resultLabel}</Text>
          </View>
        )}
        <Text style={betStyles.dateText}>{formatDate(bet.createdAt)}</Text>
      </View>

      {/* 내용 */}
      <Text style={betStyles.content}>"{bet.content}"</Text>

      {/* 팀 & 배팅 */}
      <View style={betStyles.teamRow}>
        <View style={betStyles.teamInfo}>
          <TeamEmblem shortName={bet.betOnTeam.shortName} size={32} />
          <Text style={betStyles.teamName}>
            {bet.betOnTeam.shortName} 승리에 배팅 · {bet.game.awayTeam} vs {bet.game.homeTeam}
          </Text>
        </View>
      </View>

      {/* 제안자 정보 */}
      <Text style={betStyles.meta}>
        {bet.proposer.nickname}이(가) {bet.receiver.nickname}에게 제안
      </Text>

      {/* 액션 버튼 */}
      {isPending && (
        <View style={betStyles.actions}>
          {!isProposer && (
            <TouchableOpacity
              style={betStyles.acceptBtn}
              onPress={() => onAccept(bet.id)}
              activeOpacity={0.85}
            >
              <Text style={betStyles.acceptBtnText}>콜!</Text>
            </TouchableOpacity>
          )}
          {isProposer && (
            <TouchableOpacity
              style={betStyles.cancelBtn}
              onPress={() => onCancel(bet.id)}
              activeOpacity={0.85}
            >
              <Text style={betStyles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams<{ roomId: string; roomName: string }>();
  const { firebaseUser, appUser } = useAuthStore();
  const { rooms } = useRoomStore();
  const { bets, loading: betsLoading, fetchBets, addBet, updateBet } = useBetStore();

  const [tab, setTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [betSheetVisible, setBetSheetVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  const displayName = roomName ?? rooms.find((r) => String(r.id) === roomId)?.name ?? '더그아웃';
  const roomIdNum = Number(roomId);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ChatMessage, 'id'>),
        createdAt: doc.data().createdAt?.toMillis?.() ?? Date.now(),
      }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    if (tab === 'bet' && roomIdNum) {
      fetchBets(roomIdNum);
    }
  }, [tab, roomIdNum]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !firebaseUser || !roomId) return;
    setText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        roomId,
        senderId: firebaseUser.uid,
        senderNickname: appUser?.nickname ?? '알 수 없음',
        senderTeamEmoji: appUser?.team?.emoji ?? null,
        content: trimmed,
        type: 'TEXT',
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }, [text, firebaseUser, appUser, roomId]);

  const handleAccept = async (betId: number) => {
    try {
      const updated = await api.put<Bet>(`/api/v1/bets/${betId}/accept`, {});
      updateBet(updated);
    } catch (e: any) {
      console.warn('accept failed', e.message);
    }
  };

  const handleCancel = async (betId: number) => {
    try {
      const updated = await api.put<Bet>(`/api/v1/bets/${betId}/cancel`, {});
      updateBet(updated);
    } catch (e: any) {
      console.warn('cancel failed', e.message);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === firebaseUser?.uid;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = isMyMessage(item);
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const showAvatar = !mine && item.senderId !== prev?.senderId;
    const showName = showAvatar;
    const isLastInGroup = mine
      ? messages[index + 1]?.senderId !== item.senderId
      : item.senderId !== next?.senderId;

    const avatarColor = getAvatarColor(item.senderId);
    const senderDisplay = (item as any).senderTeamEmoji
      ? `${(item as any).senderTeamEmoji} ${item.senderNickname}`
      : item.senderNickname;

    return (
      <View style={[styles.msgRow, mine && styles.msgRowMine]}>
        {!mine && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>
                  {(item as any).senderTeamEmoji ?? item.senderNickname.slice(0, 1)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        <View style={[styles.bubble, mine && styles.bubbleMineWrap]}>
          {showName && (
            <Text style={styles.sender}>{senderDisplay}</Text>
          )}
          <View style={styles.bubbleRow}>
            {mine && isLastInGroup && (
              <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
            )}
            <View style={[
              styles.bubbleInner,
              mine ? styles.bubbleMine : styles.bubbleOther,
              mine && !isLastInGroup && styles.bubbleMineMiddle,
            ]}>
              <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
            </View>
            {!mine && isLastInGroup && (
              <Text style={styles.timestampOther}>{formatTime(item.createdAt)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* 탭 스위처 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'chat' && styles.tabItemActive]}
          onPress={() => setTab('chat')}
        >
          <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>채팅</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'bet' && styles.tabItemActive]}
          onPress={() => setTab('bet')}
        >
          <Text style={[styles.tabText, tab === 'bet' && styles.tabTextActive]}>내기</Text>
          {bets.filter((b) => b.status === 'PENDING').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {bets.filter((b) => b.status === 'PENDING').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 채팅 탭 */}
      {tab === 'chat' && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>⚾</Text>
              <Text style={styles.emptyText}>첫 번째 메시지를 보내보세요!</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* 입력바 */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.callBtn}
              activeOpacity={0.7}
              onPress={() => setBetSheetVisible(true)}
            >
              <Text style={styles.callBtnText}>콜!</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="더그아웃에 메시지…"
              placeholderTextColor={Colors.placeholder}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* 내기 탭 */}
      {tab === 'bet' && (
        <View style={styles.flex}>
          {betsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : bets.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🤜</Text>
              <Text style={styles.emptyText}>아직 내기가 없어요</Text>
              <Text style={styles.emptySubText}>채팅 탭의 콜! 버튼으로 제안해보세요</Text>
            </View>
          ) : (
            <FlatList
              data={bets}
              keyExtractor={(b) => String(b.id)}
              renderItem={({ item }) => (
                <BetCard
                  bet={item}
                  myUserId={appUser?.id}
                  onAccept={handleAccept}
                  onCancel={handleCancel}
                />
              )}
              contentContainerStyle={betStyles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
          {/* 내기 탭에서도 내기 제안 가능 */}
          <TouchableOpacity
            style={betStyles.newBetBtn}
            onPress={() => setBetSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={betStyles.newBetBtnText}>내기 제안하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 내기 제안 시트 */}
      <BetSheet
        visible={betSheetVisible}
        onClose={() => setBetSheetVisible(false)}
        roomId={roomIdNum}
        onBetCreated={(bet) => {
          addBet(bet);
          setTab('bet');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.dark },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textSub },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    backgroundColor: Colors.fail, borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  emptySubText: { fontSize: 12, color: Colors.textSub, textAlign: 'center' },

  messageList: { padding: 16, paddingBottom: 8, gap: 2 },

  msgRow: { flexDirection: 'row', marginVertical: 2, alignItems: 'flex-end' },
  msgRowMine: { flexDirection: 'row-reverse' },

  avatarSlot: { width: 38, marginRight: 7, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  bubble: { maxWidth: '74%' },
  bubbleMineWrap: { alignItems: 'flex-end' },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },

  sender: { fontSize: 11, color: Colors.textSub, fontWeight: '700', marginBottom: 3, marginLeft: 2 },

  bubbleInner: {
    borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10, flexShrink: 1,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 5,
    shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bubbleMineMiddle: { borderTopRightRadius: 18, borderBottomRightRadius: 18 },
  bubbleOther: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: { fontSize: 14.5, color: Colors.dark, lineHeight: 20, fontWeight: '500' },
  msgTextMine: { color: '#fff', fontWeight: '600' },

  timestamp: { fontSize: 10, color: Colors.placeholder, fontWeight: '600', marginBottom: 3 },
  timestampOther: { fontSize: 10, color: Colors.placeholder, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 3 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  callBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  callBtnText: { fontSize: 13, fontWeight: '900', color: Colors.success },
  input: {
    flex: 1, height: 42,
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14.5, fontWeight: '500', color: Colors.dark,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: Colors.placeholder, shadowOpacity: 0 },
});

const betStyles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  resultBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  winBadge: { backgroundColor: `${Colors.primary}20` },
  loseBadge: { backgroundColor: `${Colors.fail}18` },
  resultText: { fontSize: 11, fontWeight: '800', color: Colors.dark },
  dateText: { fontSize: 10, color: Colors.placeholder, marginLeft: 'auto' },

  content: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 13, fontWeight: '600', color: Colors.textSub },

  meta: { fontSize: 12, color: Colors.placeholder },

  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textSub },

  newBetBtn: {
    position: 'absolute', bottom: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  newBetBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
