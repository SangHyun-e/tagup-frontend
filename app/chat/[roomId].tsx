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
import { Colors } from '../../src/constants/colors';
import { ChatMessage } from '../../src/types';

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

export default function ChatScreen() {
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams<{ roomId: string; roomName: string }>();
  const { firebaseUser, appUser } = useAuthStore();
  const { rooms } = useRoomStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const displayName = roomName ?? rooms.find((r) => String(r.id) === roomId)?.name ?? '더그아웃';

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
          <TouchableOpacity style={styles.callBtn} activeOpacity={0.7}>
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

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSub },

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
    borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10,
    flexShrink: 1,
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
