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
import { Room } from '../../src/types';

type ModalType = 'create' | 'join' | null;

function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.roomCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.roomIcon}>
        <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
      </View>
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{room.name}</Text>
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

  const [modal, setModal] = useState<ModalType>(null);
  const [roomName, setRoomName] = useState('');
  const [tagCode, setTagCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.get<Room[]>('/api/v1/rooms');
      setRooms(data ?? []);
    } catch {
      // 네트워크 오류 시 기존 목록 유지
    } finally {
      setRefreshing(false);
    }
  }, [setRooms]);

  useFocusEffect(
    useCallback(() => {
      fetchRooms(true);
    }, [fetchRooms]),
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
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>
          안녕하세요, {appUser?.nickname ?? '야구팬'}님! ⚾
        </Text>
        <Text style={styles.subtitle}>내 더그아웃을 만들어 친구를 태그해보세요.</Text>

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
          <FlatList
            data={rooms}
            keyExtractor={(r) => String(r.id)}
            renderItem={({ item }) => (
              <RoomCard room={item} onPress={() => navigateToChat(item)} />
            )}
            contentContainerStyle={styles.roomList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchRooms()}
                tintColor={Colors.primary}
              />
            }
            scrollEnabled={false}
          />
        )}
      </View>

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
              style={[styles.modalInput, styles.codeInput]}
              placeholder="6자리 태그코드"
              placeholderTextColor={Colors.placeholder}
              value={tagCode}
              onChangeText={(v) => setTagCode(v.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (tagCode.trim().length !== 6 || submitting) && styles.modalConfirmDisabled]}
                onPress={handleJoinRoom}
                disabled={tagCode.trim().length !== 6 || submitting}
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  greeting: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  subtitle: { fontSize: 13, color: Colors.textSub, marginTop: -8 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  primaryButton: { backgroundColor: Colors.primary },
  secondaryButton: { backgroundColor: Colors.surface },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  sectionCount: { fontSize: 13, color: Colors.textSub },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  emptySubtext: { fontSize: 13, color: Colors.textSub, textAlign: 'center' },
  roomList: { gap: 10 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: { flex: 1, gap: 2 },
  roomName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  roomMeta: { fontSize: 12, color: Colors.textSub },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: { letterSpacing: 4, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSub },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmDisabled: { backgroundColor: Colors.placeholder },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
