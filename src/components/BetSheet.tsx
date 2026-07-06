import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';
import { Game, Bet, Team } from '../types';
import { TeamEmblem } from './emblems/TeamEmblem';

interface Props {
  visible: boolean;
  onClose: () => void;
  roomId: number;
  onBetCreated: (bet: Bet) => void;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function BetSheet({ visible, onClose, roomId, onBetCreated }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [gameDateLabel, setGameDateLabel] = useState('오늘');
  const [loadingGames, setLoadingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedGame(null);
    setSelectedTeam(null);
    setContent('');
    fetchNearbyGames();
  }, [visible]);

  const fetchNearbyGames = async () => {
    setLoadingGames(true);
    try {
      // 오늘 기준 0, +1, -1, +2, -2, +3, -3 순으로 경기 있는 날 탐색
      const today = new Date();
      const offsets = [0, 1, -1, 2, -2, 3, -3];
      const labels = ['오늘', '내일', '어제', '모레', '그저께', '3일 후', '3일 전'];

      for (let i = 0; i < offsets.length; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + offsets[i]);
        const dateStr = toDateStr(d);
        try {
          const result = await api.get<Game[]>(`/api/v1/games?date=${dateStr}`);
          if (result && result.length > 0) {
            setGames(result);
            setGameDateLabel(labels[i]);
            return;
          }
        } catch {}
      }
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setSelectedTeam(null);
  };

  const handleSubmit = async () => {
    if (!selectedGame || !selectedTeam || !content.trim()) {
      Alert.alert('입력 확인', '경기, 응원 팀, 내기 내용을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const bet = await api.post<Bet>(`/api/v1/rooms/${roomId}/bets`, {
        content: content.trim(),
        gameId: selectedGame.id,
        betOnTeamId: selectedTeam.id,
      });
      onBetCreated(bet);
      onClose();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '내기 제안에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedGame && !!selectedTeam && content.trim().length > 0;

  const QUICK_CONTENTS = ['커피 한 잔', '밥 사기', '치킨 사기', '아이스크림'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>내기 제안하기</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 경기 선택 */}
            <Text style={styles.label}>경기 선택 ({gameDateLabel})</Text>
            {loadingGames ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : games.length === 0 ? (
              <Text style={styles.emptyText}>근처 경기를 찾을 수 없습니다.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gameRow}
              >
                {games.map((game) => {
                  const selected = selectedGame?.id === game.id;
                  return (
                    <TouchableOpacity
                      key={game.id}
                      style={[styles.gameCard, selected && styles.gameCardSelected]}
                      onPress={() => handleSelectGame(game)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.gameTeams}>
                        <TeamEmblem shortName={game.awayTeam.shortName} size={32} />
                        <Text style={styles.vsText}>vs</Text>
                        <TeamEmblem shortName={game.homeTeam.shortName} size={32} />
                      </View>
                      <Text style={styles.gameLabel}>
                        {game.awayTeam.shortName} · {game.homeTeam.shortName}
                      </Text>
                      <Text style={styles.stadiumText}>{game.stadium}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 응원 팀 선택 */}
            {selectedGame && (
              <>
                <Text style={[styles.label, { marginTop: 20 }]}>어느 팀 응원?</Text>
                <View style={styles.teamRow}>
                  {[selectedGame.awayTeam, selectedGame.homeTeam].map((team) => {
                    const picked = selectedTeam?.id === team.id;
                    return (
                      <TouchableOpacity
                        key={team.id}
                        style={[styles.teamPick, picked && styles.teamPickSelected]}
                        onPress={() => setSelectedTeam(team)}
                        activeOpacity={0.8}
                      >
                        <TeamEmblem shortName={team.shortName} size={44} />
                        <Text style={[styles.teamPickName, picked && styles.teamPickNameSelected]}>
                          {team.shortName}
                        </Text>
                        <View style={[styles.radio, picked && styles.radioSelected]}>
                          {picked && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* 내기 내용 */}
            <Text style={[styles.label, { marginTop: 20 }]}>내기 내용</Text>
            <View style={styles.quickRow}>
              {QUICK_CONTENTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickChip, content === q && styles.quickChipSelected]}
                  onPress={() => setContent(q)}
                >
                  <Text style={[styles.quickChipText, content === q && styles.quickChipTextSelected]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="직접 입력… (예: 아침 커피)"
              placeholderTextColor={Colors.placeholder}
              maxLength={50}
            />

            {/* 제안 버튼 */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>제안하기</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  handle: {
    width: 42, height: 5, borderRadius: 999,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', color: Colors.dark, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginBottom: 10 },
  emptyText: { fontSize: 13, color: Colors.textSub, textAlign: 'center', paddingVertical: 12 },

  gameRow: { gap: 10, paddingBottom: 4 },
  gameCard: {
    width: 130,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  gameCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  gameTeams: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vsText: { fontSize: 10, fontWeight: '700', color: Colors.placeholder },
  gameLabel: { fontSize: 11, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  stadiumText: { fontSize: 10, color: Colors.textSub },

  teamRow: { flexDirection: 'row', gap: 12 },
  teamPick: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14,
    borderRadius: 16, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  teamPickSelected: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  teamPickName: { fontSize: 13, fontWeight: '700', color: Colors.textSub },
  teamPickNameSelected: { color: Colors.primary },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  quickChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  quickChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  quickChipTextSelected: { color: Colors.primary },
  contentInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.dark, backgroundColor: Colors.surface,
    marginBottom: 20,
  },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: Colors.placeholder, shadowOpacity: 0 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
