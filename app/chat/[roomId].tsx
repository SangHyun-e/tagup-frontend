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
import { ChatMessage, Bet, Room } from '../../src/types';
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

  // 제안자의 반대편 팀 (콜하는 사람이 배팅하게 되는 팀)
  const oppositeTeam =
    bet.game.homeTeam === bet.betOnTeam.shortName ? bet.game.awayTeam : bet.game.homeTeam;

  // proposerResult는 제안자 기준 → 승자 닉네임으로 변환해 표시
  const resultLabel =
    bet.proposerResult === 'DRAW'
      ? '🤝 무승부'
      : bet.proposerResult === 'WIN'
        ? `🏆 ${bet.proposer.nickname} 승`
        : bet.proposerResult === 'LOSE'
          ? `🏆 ${bet.receiver?.nickname ?? '상대'} 승`
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

      {/* 대진 정보 */}
      {bet.receiver ? (
        <Text style={betStyles.meta}>
          {bet.proposer.nickname}({bet.betOnTeam.shortName}) vs {bet.receiver.nickname}({oppositeTeam})
        </Text>
      ) : (
        <Text style={betStyles.metaOpen}>
          {bet.proposer.nickname}님이 걸었어요 · 콜하면 {oppositeTeam} 승리에 배팅!
        </Text>
      )}

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
  const { roomId, roomName, chatKey: chatKeyParam } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
    chatKey?: string;
  }>();
  const { firebaseUser, appUser } = useAuthStore();
  const { rooms } = useRoomStore();
  const { bets, loading: betsLoading, fetchBets, addBet, updateBet } = useBetStore();

  const [tab, setTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [betSheetVisible, setBetSheetVisible] = useState(false);
  const [plusPanelOpen, setPlusPanelOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const displayName = roomName ?? rooms.find((r) => String(r.id) === roomId)?.name ?? '더그아웃';
  const roomIdNum = Number(roomId);

  // 채팅 경로 키: 파라미터 → 스토어 → 방 상세 API 순으로 확보
  const [chatKey, setChatKey] = useState<string | null>(
    chatKeyParam ?? rooms.find((r) => String(r.id) === roomId)?.chatKey ?? null,
  );

  useEffect(() => {
    if (chatKey || !roomId) return;
    api
      .get<Room>(`/api/v1/rooms/${roomId}`)
      .then((room) => setChatKey(room.chatKey))
      .catch((e) => console.warn('chatKey 조회 실패', e.message));
  }, [chatKey, roomId]);

  useEffect(() => {
    if (!chatKey) return;
    const q = query(
      collection(db, 'rooms', chatKey, 'messages'),
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
  }, [chatKey]);

  // 채팅 탭의 배팅 카드(콜/취소 버튼)도 배팅 상태가 필요하므로 진입 시 로드
  useEffect(() => {
    if (roomIdNum) fetchBets(roomIdNum);
  }, [roomIdNum]);

  useEffect(() => {
    if (tab === 'bet' && roomIdNum) fetchBets(roomIdNum);
  }, [tab, roomIdNum]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !firebaseUser || !chatKey) return;
    setText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'rooms', chatKey, 'messages'), {
        roomId,
        senderId: firebaseUser.uid,
        senderNickname: appUser?.nickname ?? '알 수 없음',
        senderTeamEmoji: appUser?.team?.emoji ?? null,
        senderTeamShort: appUser?.team?.shortName ?? null,
        content: trimmed,
        type: 'TEXT',
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }, [text, firebaseUser, appUser, chatKey]);

  // 내기 이벤트 안내 메시지 (제안/콜/취소는 행동한 유저의 앱이 작성, 정산은 BE가 작성)
  const announceBetEvent = useCallback(
    async (content: string, betId: number) => {
      if (!chatKey) return;
      try {
        await addDoc(collection(db, 'rooms', chatKey, 'messages'), {
          roomId,
          senderId: 'system',
          senderNickname: '태그업',
          content,
          type: 'BET',
          betId,
          createdAt: serverTimestamp(),
        });
      } catch (e: any) {
        console.warn('bet announce failed', e.message);
      }
    },
    [chatKey, roomId],
  );

  const handleBetCreated = (bet: Bet) => {
    addBet(bet);
    announceBetEvent(
      `⚾ ${bet.proposer.nickname}님이 배팅을 걸었어요 — 받을 사람 콜!\n"${bet.content}" · ${bet.betOnTeam.shortName} 승리에 배팅`,
      bet.id,
    );
  };

  const handleAccept = async (betId: number) => {
    try {
      const updated = await api.put<Bet>(`/api/v1/bets/${betId}/accept`, {});
      updateBet(updated);
      const opposite =
        updated.game.homeTeam === updated.betOnTeam.shortName
          ? updated.game.awayTeam
          : updated.game.homeTeam;
      announceBetEvent(
        `📣 ${updated.receiver?.nickname}님이 콜! 배팅 성립\n${updated.proposer.nickname}(${updated.betOnTeam.shortName}) vs ${updated.receiver?.nickname}(${opposite}) · "${updated.content}"`,
        updated.id,
      );
    } catch (e: any) {
      console.warn('accept failed', e.message);
    }
  };

  const handleCancel = async (betId: number) => {
    try {
      const updated = await api.put<Bet>(`/api/v1/bets/${betId}/cancel`, {});
      updateBet(updated);
      announceBetEvent(`↩️ 내기가 취소됐어요 — "${updated.content}"`, updated.id);
    } catch (e: any) {
      console.warn('cancel failed', e.message);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === firebaseUser?.uid;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    // 시스템 안내 메시지 (내기 제안/콜/취소/정산) — 가운데 정렬 카드
    if (item.senderId === 'system' || item.type === 'BET') {
      const linkedBet = item.betId != null ? bets.find((b) => b.id === item.betId) : undefined;
      const actionable = linkedBet?.status === 'PENDING';
      const amProposer = linkedBet?.proposer.id === appUser?.id;
      return (
        <View style={styles.sysMsgRow}>
          <View style={styles.sysMsgCard}>
            <Text style={styles.sysMsgText}>{item.content}</Text>
            {actionable && linkedBet && (
              <View style={styles.sysMsgActions}>
                {!amProposer && (
                  <TouchableOpacity
                    style={styles.sysAcceptBtn}
                    onPress={() => handleAccept(linkedBet.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sysAcceptText}>콜!</Text>
                  </TouchableOpacity>
                )}
                {amProposer && (
                  <TouchableOpacity
                    style={styles.sysCancelBtn}
                    onPress={() => handleCancel(linkedBet.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.sysCancelText}>취소</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    const mine = isMyMessage(item);
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const showAvatar = !mine && item.senderId !== prev?.senderId;
    const showName = showAvatar;
    const isLastInGroup = mine
      ? messages[index + 1]?.senderId !== item.senderId
      : item.senderId !== next?.senderId;

    const avatarColor = getAvatarColor(item.senderId);
    const senderDisplay = item.senderTeamShort
      ? `${item.senderNickname} · ${item.senderTeamShort}`
      : (item as any).senderTeamEmoji
        ? `${(item as any).senderTeamEmoji} ${item.senderNickname}`
        : item.senderNickname;

    return (
      <View style={[styles.msgRow, mine && styles.msgRowMine]}>
        {!mine && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              item.senderTeamShort ? (
                <TeamEmblem shortName={item.senderTeamShort} size={38} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {(item as any).senderTeamEmoji ?? item.senderNickname.slice(0, 1)}
                  </Text>
                </View>
              )
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
              style={styles.plusBtn}
              activeOpacity={0.7}
              onPress={() => setPlusPanelOpen((v) => !v)}
            >
              <Ionicons name={plusPanelOpen ? 'close' : 'add'} size={22} color={Colors.textSub} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              onFocus={() => setPlusPanelOpen(false)}
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

          {/* 더보기 패널 */}
          {plusPanelOpen && (
            <View style={styles.plusPanel}>
              <TouchableOpacity
                style={styles.plusItem}
                activeOpacity={0.7}
                onPress={() => {
                  setPlusPanelOpen(false);
                  setBetSheetVisible(true);
                }}
              >
                <View style={styles.plusItemIcon}>
                  <Ionicons name="baseball-outline" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.plusItemLabel}>배팅 걸기</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <Text style={styles.emptySubText}>채팅창 왼쪽 + 버튼으로 배팅을 걸어보세요</Text>
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
        </View>
      )}

      {/* 내기 제안 시트 */}
      <BetSheet
        visible={betSheetVisible}
        onClose={() => setBetSheetVisible(false)}
        roomId={roomIdNum}
        onBetCreated={(bet) => {
          handleBetCreated(bet);
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
  sysMsgRow: { alignItems: 'center', marginVertical: 8 },
  sysMsgCard: {
    backgroundColor: `${Colors.primary}12`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  sysMsgText: { fontSize: 12, fontWeight: '600', color: Colors.dark, textAlign: 'center', lineHeight: 18 },
  sysMsgActions: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  sysAcceptBtn: {
    backgroundColor: Colors.primary, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 6,
  },
  sysAcceptText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  sysCancelBtn: {
    backgroundColor: Colors.surface, borderRadius: 999, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 18, paddingVertical: 6,
  },
  sysCancelText: { fontSize: 12, fontWeight: '700', color: Colors.textSub },
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
  plusPanel: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 20,
    paddingHorizontal: 24, paddingVertical: 20,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface, minHeight: 120,
  },
  plusItem: { alignItems: 'center', gap: 8, width: 64 },
  plusItemIcon: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  plusItemLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  plusBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
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
  metaOpen: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginTop: 2 },

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
});
