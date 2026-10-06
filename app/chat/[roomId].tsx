import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../src/components/common/Text';
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
import { Radius, Spacing, Type } from '../../src/constants/theme';
import { ChatMessage, Bet, Room, AtBatResult } from '../../src/types';
import { BetSheet } from '../../src/components/BetSheet';
import { api } from '../../src/lib/api';
import { TeamEmblem } from '../../src/components/emblems/TeamEmblem';
import { LiveRelayLine } from '../../src/components/chat/LiveRelayLine';

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

/** BE 의 tagup.bet.at-bat-window-seconds 와 맞춘다 */
const AT_BAT_WINDOW_MS = 30_000;
/** 창이 닫힌 뒤 안내를 남겨두는 시간 */
const AT_BAT_CARD_LINGER_MS = 5 * 60_000;
/** 30초 창에서 내용을 입력받을 여유가 없어 기본값으로 건다 */
const AT_BAT_DEFAULT_STAKE = '커피 한 잔';

/** "7회초" — half 가 TOP/BOTTOM 그대로 찍히던 것을 한글로 */
function atBatWhere(bet: Bet): string {
  const at = bet.atBat;
  if (!at?.inning) return '';
  return `${at.inning}회${at.half === 'BOTTOM' ? '말' : '초'}`;
}

const BET_STATUS_LABEL: Record<string, string> = {
  PENDING: '콜 대기',
  ACCEPTED: '성립',
  FINISHED: '종료',
  CANCELLED: '취소',
};

const BET_STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.textSub,
  ACCEPTED: Colors.primary,
  FINISHED: Colors.textSub,
  CANCELLED: Colors.placeholder,
};

/**
 * 타석 배팅의 '편' 이름.
 *
 * KBO 응답으로는 안타·볼넷·뜬공·땅볼을 구분할 수 없어 아웃/세이프뿐이다.
 * 여기에 "안타" 같은 표현을 쓰면 없는 정보를 있는 것처럼 보여주게 된다.
 */
function atBatSideLabel(result?: AtBatResult | null): string {
  if (result === 'OUT') return '아웃';
  if (result === 'SAFE') return '세이프';
  return '판정 불가';
}

/** 제안자가 건 쪽 */
function mySideOf(bet: Bet): string {
  return bet.type === 'AT_BAT'
    ? atBatSideLabel(bet.atBat?.betOnResult)
    : (bet.betOnTeam?.shortName ?? '');
}

/** 콜한 사람이 서게 되는 쪽 */
function oppositeSideOf(bet: Bet): string {
  if (bet.type === 'AT_BAT') {
    return atBatSideLabel(bet.atBat?.betOnResult === 'OUT' ? 'SAFE' : 'OUT');
  }
  return bet.game.homeTeam === bet.betOnTeam?.shortName ? bet.game.awayTeam : bet.game.homeTeam;
}

/** 안내 메시지용 — 무엇에 걸었는지 한 줄 */
function betTargetText(bet: Bet): string {
  return bet.type === 'AT_BAT'
    ? `${bet.atBat?.inning}회${bet.atBat?.half} ${bet.atBat?.batter} 타석 · ${mySideOf(bet)}에 배팅`
    : `${mySideOf(bet)} 승리에 배팅`;
}

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

  const isAtBat = bet.type === 'AT_BAT';

  // 제안자의 반대편 (콜하는 사람이 서게 되는 쪽)
  // 승패 배팅이면 상대 팀, 타석 배팅이면 반대 결과
  const oppositeLabel = isAtBat
    ? atBatSideLabel(bet.atBat?.betOnResult === 'OUT' ? 'SAFE' : 'OUT')
    : bet.game.homeTeam === bet.betOnTeam?.shortName
      ? bet.game.awayTeam
      : bet.game.homeTeam;

  const mySideLabel = isAtBat
    ? atBatSideLabel(bet.atBat?.betOnResult)
    : (bet.betOnTeam?.shortName ?? '');

  // proposerResult는 제안자 기준 → 승자 닉네임으로 변환해 표시
  // 타석 배팅의 DRAW는 비긴 게 아니라 '결과를 판정하지 못해 무효'다 (중계 데이터가 끊긴 타석,
  // 경기 마지막 타석을 놓친 경우 등). 무승부라고 쓰면 오해한다.
  const isVoid = bet.proposerResult === 'DRAW' && isAtBat;
  const resultLabel =
    bet.proposerResult === 'DRAW'
      ? (isAtBat ? '무효' : '무승부')
      : bet.proposerResult === 'WIN'
        ? `${bet.proposer.nickname} 적중`
        : bet.proposerResult === 'LOSE'
          ? `${bet.receiver?.nickname ?? '상대'} 적중`
          : null;
  const iWon =
    (bet.proposerResult === 'WIN' && isProposer) ||
    (bet.proposerResult === 'LOSE' && !isProposer);
  const isDraw = bet.proposerResult === 'DRAW';

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
          <View
            style={[
              betStyles.resultBadge,
              isDraw ? betStyles.drawBadge : iWon ? betStyles.winBadge : betStyles.loseBadge,
            ]}
          >
            <Text style={betStyles.resultText}>{resultLabel}</Text>
          </View>
        )}
        <Text style={betStyles.dateText}>{formatDate(bet.createdAt)}</Text>
      </View>

      {/* 내용 */}
      <Text style={betStyles.content}>"{bet.content}"</Text>
      {isVoid && (
        <Text style={betStyles.voidNote}>타석 결과를 확인하지 못해 무효 처리됐어요</Text>
      )}

      {/* 무엇에 걸었는지 */}
      <View style={betStyles.teamRow}>
        <View style={betStyles.teamInfo}>
          {isAtBat ? (
            <View
              style={[
                betStyles.atBatIcon,
                { backgroundColor: bet.atBat?.betOnResult === 'OUT' ? Colors.outSoft : Colors.safeSoft },
              ]}
            >
              <Ionicons
                name={bet.atBat?.betOnResult === 'OUT' ? 'close' : 'checkmark'}
                size={18}
                color={bet.atBat?.betOnResult === 'OUT' ? Colors.out : Colors.safe}
              />
            </View>
          ) : (
            <TeamEmblem shortName={bet.betOnTeam?.shortName ?? ''} size={32} />
          )}
          <Text style={betStyles.teamName}>
            {isAtBat
              ? `${atBatWhere(bet)} ${bet.atBat?.batter} 타석 · ${mySideLabel}`
              : `${mySideLabel} 승리 · ${bet.game.awayTeam} vs ${bet.game.homeTeam}`}
          </Text>
        </View>
      </View>

      {/* 대진 정보 */}
      {bet.receiver ? (
        <Text style={betStyles.meta}>
          {bet.proposer.nickname}({mySideLabel}) vs {bet.receiver.nickname}({oppositeLabel})
        </Text>
      ) : (
        <Text style={betStyles.metaOpen}>
          {bet.proposer.nickname}님이 걸었어요 · 콜하면 {oppositeLabel}
          {isAtBat ? '에 배팅!' : ' 승리에 배팅!'}
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
      `${bet.proposer.nickname}님이 배팅을 걸었어요 — 받을 사람 콜!\n"${bet.content}" · ${betTargetText(bet)}`,
      bet.id,
    );
  };

  const handleAccept = async (betId: number) => {
    try {
      const updated = await api.put<Bet>(`/api/v1/bets/${betId}/accept`, {});
      updateBet(updated);
      const opposite = oppositeSideOf(updated);
      announceBetEvent(
        `${updated.receiver?.nickname}님이 콜! 배팅 성립\n${updated.proposer.nickname}(${mySideOf(updated)}) vs ${updated.receiver?.nickname}(${opposite}) · "${updated.content}"`,
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
      announceBetEvent(`내기가 취소됐어요 — "${updated.content}"`, updated.id);
    } catch (e: any) {
      console.warn('cancel failed', e.message);
    }
  };

  // 타석 배팅 창은 30초라 1초마다 남은 시간을 다시 그린다.
  // 창이 열려 있을 때만 타이머를 돌린다 — 경기 내내 초당 리렌더링할 이유가 없다.
  const [nowTs, setNowTs] = useState(Date.now());
  const latestAtBatStart = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === 'LIVE' && m.liveKind === 'AT_BAT_START') return m;
      if (m.type === 'LIVE' && m.liveKind === 'AT_BAT_RESULT') return undefined; // 그 타석은 이미 끝났다
    }
    return undefined;
  }, [messages]);

  const windowOpen =
    !!latestAtBatStart && nowTs - latestAtBatStart.createdAt < AT_BAT_WINDOW_MS;

  useEffect(() => {
    if (!latestAtBatStart) return;
    if (Date.now() - latestAtBatStart.createdAt >= AT_BAT_WINDOW_MS) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [latestAtBatStart]);

  const [atBatSubmitting, setAtBatSubmitting] = useState(false);
  const [betAtBatMsgId, setBetAtBatMsgId] = useState<string | null>(null);

  const handleAtBatBet = async (betOnResult: AtBatResult) => {
    if (atBatSubmitting) return;
    setAtBatSubmitting(true);
    try {
      const bet = await api.post<Bet>(`/api/v1/rooms/${roomId}/bets/at-bat`, {
        betOnResult,
        content: AT_BAT_DEFAULT_STAKE,
      });
      addBet(bet);
      if (latestAtBatStart) setBetAtBatMsgId(latestAtBatStart.id);
      await announceBetEvent(
        `${bet.proposer.nickname}님이 배팅을 걸었어요 — 받을 사람 콜!\n"${bet.content}" · ${betTargetText(bet)}`,
        bet.id,
      );
    } catch (e: any) {
      // 서버가 창 마감·타석 없음 등을 구분해 알려준다
      Alert.alert('배팅하지 못했어요', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setAtBatSubmitting(false);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === firebaseUser?.uid;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    // 실시간 중계 (서버 발송) — 타석 시작에만 배팅 버튼을 붙인다
    if (item.type === 'LIVE') {
      const isStart = item.liveKind === 'AT_BAT_START';
      const isCurrent = latestAtBatStart?.id === item.id;
      const alreadyBet = betAtBatMsgId === item.id;
      const remainSec = Math.max(
        0,
        Math.ceil((item.createdAt + AT_BAT_WINDOW_MS - nowTs) / 1000),
      );
      const canBet = isStart && isCurrent && windowOpen && !alreadyBet;

      // 창이 닫힌 뒤에도 잠깐은 "지났어요"를 남겨 왜 못 걸었는지 알려준다.
      // 다만 하루 지난 타석까지 카드가 남으면 군더더기라 5분까지만 보여준다.
      const recentlyClosed =
        isStart && isCurrent && !windowOpen && nowTs - item.createdAt < AT_BAT_CARD_LINGER_MS;

      return (
        <View style={styles.liveRow}>
          <LiveRelayLine message={item} />

          {(canBet || recentlyClosed || alreadyBet) && (
          <View style={styles.liveCard}>

            {canBet && (
              <>
                <View style={styles.liveBetRow}>
                  <TouchableOpacity
                    style={[styles.liveBetBtn, styles.liveBetOut]}
                    onPress={() => handleAtBatBet('OUT')}
                    disabled={atBatSubmitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={16} color={Colors.out} />
                    <Text style={[styles.liveBetBtnText, { color: Colors.out }]}>아웃</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.liveBetBtn, styles.liveBetSafe]}
                    onPress={() => handleAtBatBet('SAFE')}
                    disabled={atBatSubmitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.safe} />
                    <Text style={[styles.liveBetBtnText, { color: Colors.safe }]}>세이프</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.liveCountdown}>
                  {remainSec}초 남음 · {AT_BAT_DEFAULT_STAKE}
                </Text>
              </>
            )}

            {recentlyClosed && !alreadyBet && (
              <Text style={styles.liveClosed}>이번 타석은 지났어요</Text>
            )}
            {alreadyBet && <Text style={styles.liveClosed}>걸어뒀어요 · 콜 대기 중</Text>}
          </View>
          )}
        </View>
      );
    }

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
    // 예전 메시지에는 팀 이모지가 박혀 있었다. 이제 엠블럼과 약칭으로만 보여준다
    const senderDisplay = item.senderTeamShort
      ? `${item.senderNickname} · ${item.senderTeamShort}`
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
                    {item.senderNickname.slice(0, 1)}
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
              <Ionicons name="chatbubbles-outline" size={44} color={Colors.placeholder} />
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
              <Ionicons name="hand-right-outline" size={44} color={Colors.placeholder} />
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
  headerTitle: { ...Type.sectionTitle, fontSize: 15, color: Colors.dark },

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
  tabText: { ...Type.button, color: Colors.textMuted },
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
  // 실시간 중계 — 경기당 140~200건이 흐르므로 대화보다 눈에 덜 띄게 둔다
  liveRow: { alignItems: 'center', marginVertical: 5, gap: 8 },
  // 지금 타석의 배팅 창. 중계 줄(LiveRelayLine)과 달리 눈에 띄어야 한다
  liveCard: {
    width: '100%',
    backgroundColor: '#F7FBF6',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 10,
  },
  liveBetRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  liveBetBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
  },
  liveBetOut: { borderColor: Colors.out },
  liveBetSafe: { borderColor: Colors.safe },
  liveBetBtnText: { ...Type.button, fontSize: 14.5 },
  liveCountdown: { ...Type.micro, color: Colors.textMuted, textAlign: 'center' },
  liveClosed: { ...Type.micro, color: Colors.textMuted, textAlign: 'center' },

  sysMsgRow: { alignItems: 'stretch', marginVertical: 10 },
  // 내기 제안·정산 안내. 대화보다 한 단계 또렷해야 하지만 배팅 창만큼 튀면 안 된다
  sysMsgCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 10,
  },
  sysMsgText: { ...Type.caption, color: Colors.dark, textAlign: 'center' },
  sysMsgActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sysAcceptBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 22, height: 38, justifyContent: 'center',
  },
  sysAcceptText: { ...Type.button, fontSize: 13, color: Colors.white },
  sysCancelBtn: {
    backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.borderStrong,
    paddingHorizontal: 22, height: 38, justifyContent: 'center',
  },
  sysCancelText: { ...Type.button, fontSize: 13, color: Colors.textSub },
  msgRowMine: { flexDirection: 'row-reverse' },

  avatarSlot: { width: 38, marginRight: 7, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Type.badge, fontSize: 13, color: Colors.white },

  bubble: { maxWidth: '74%' },
  bubbleMineWrap: { alignItems: 'flex-end' },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },

  sender: { ...Type.micro, color: Colors.textMuted, marginBottom: 3, marginLeft: 2 },

  bubbleInner: {
    borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, flexShrink: 1,
  },
  // 그림자를 걷었다. 한 화면에 말풍선이 수십 개 쌓이는데 저마다 그림자를 지면 화면이 지저분해진다
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  bubbleMineMiddle: { borderBottomRightRadius: 16, borderTopRightRadius: 16 },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 5,
  },
  msgText: { ...Type.body, color: Colors.dark },
  msgTextMine: { color: Colors.white },

  timestamp: { ...Type.micro, fontSize: 10, color: Colors.placeholder, marginBottom: 3 },
  timestampOther: { ...Type.micro, fontSize: 10, color: Colors.placeholder, alignSelf: 'flex-end', marginBottom: 3 },

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
  // 그림자 대신 선으로 띄운다. 카드가 여러 장 쌓이면 그림자는 지저분해진다
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { ...Type.badge },
  resultBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  winBadge: { backgroundColor: `${Colors.primary}20` },
  loseBadge: { backgroundColor: `${Colors.fail}18` },
  drawBadge: { backgroundColor: `${Colors.placeholder}20` },
  resultText: { ...Type.badge, color: Colors.dark },
  dateText: { ...Type.micro, fontSize: 10, color: Colors.placeholder, marginLeft: 'auto' },

  content: { ...Type.sectionTitle, color: Colors.dark },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atBatIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  teamName: { ...Type.caption, fontSize: 13, color: Colors.textSub },

  voidNote: { ...Type.caption, color: Colors.textMuted, marginTop: 2 },
  meta: { ...Type.caption, color: Colors.textMuted },
  metaOpen: { ...Type.caption, fontFamily: undefined, fontWeight: '700', color: Colors.primary, marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { ...Type.button, color: Colors.white },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.borderStrong,
    borderRadius: Radius.md, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...Type.button, color: Colors.textSub },
});
