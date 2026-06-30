import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { Team } from '../src/types';

export default function TeamSelectScreen() {
  const router = useRouter();
  const { appUser, setAppUser } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(appUser?.teamId ?? null);

  useEffect(() => {
    api
      .get<Team[]>('/api/v1/teams')
      .then((data) => setTeams(data ?? []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (selectedId === null) return;
    setSaving(true);
    try {
      const updated = await api.put<{ teamId: number }>('/api/v1/users/me/team', {
        teamId: selectedId,
      });
      if (appUser) {
        const team = teams.find((t) => t.id === selectedId) ?? null;
        setAppUser({ ...appUser, teamId: updated.teamId, team });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const renderTeam = ({ item }: { item: Team }) => {
    const selected = item.id === selectedId;
    return (
      <TouchableOpacity
        style={[styles.teamCard, selected && styles.teamCardSelected]}
        onPress={() => setSelectedId(item.id)}
        activeOpacity={0.7}
      >
        {selected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          </View>
        )}
        <Text style={styles.teamEmoji}>{item.emoji}</Text>
        <Text style={[styles.teamName, selected && styles.teamNameSelected]} numberOfLines={1}>
          {item.shortName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>응원 구단 설정</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (selectedId === null || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={selectedId === null || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>응원하는 KBO 구단을 선택해주세요.</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(t) => String(t.id)}
          numColumns={2}
          renderItem={renderTeam}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: Colors.placeholder },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  subtitle: { fontSize: 13, color: Colors.textSub, textAlign: 'center', marginTop: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: 16, gap: 12 },
  row: { gap: 12 },
  teamCard: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  teamCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accentLight,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamEmoji: { fontSize: 36 },
  teamName: { fontSize: 13, fontWeight: '700', color: Colors.textSub },
  teamNameSelected: { color: Colors.primary },
});
