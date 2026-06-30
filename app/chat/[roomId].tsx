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
    const showName = !mine && item.senderId !== prev?.senderId;

    return (
      <View style={[styles.msgRow, mine && styles.msgRowMine]}>
        {!mine && (
          <View style={styles.avatarSlot}>
            {showName && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.senderNickname.slice(0, 1)}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.bubble}>
          {showName && (
            <Text style={styles.sender}>{item.senderNickname}</Text>
          )}
          <View style={[styles.bubbleInner, mine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
          </View>
          <Text style={[styles.timestamp, mine && styles.timestampMine]}>
            {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
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

        {/* 입력창 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="메시지를 입력하세요"
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
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSub },
  messageList: { padding: 16, gap: 4 },

  msgRow: { flexDirection: 'row', marginVertical: 2, alignItems: 'flex-end' },
  msgRowMine: { flexDirection: 'row-reverse' },
  avatarSlot: { width: 36, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  bubble: { maxWidth: '72%' },
  sender: { fontSize: 11, color: Colors.textSub, marginBottom: 2, marginLeft: 2 },
  bubbleInner: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  msgText: { fontSize: 14, color: Colors.dark, lineHeight: 20 },
  msgTextMine: { color: Colors.white },
  timestamp: { fontSize: 10, color: Colors.placeholder, marginTop: 2, marginLeft: 4 },
  timestampMine: { textAlign: 'right', marginRight: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.dark,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.placeholder },
});
