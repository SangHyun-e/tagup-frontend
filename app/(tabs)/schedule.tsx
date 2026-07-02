import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/lib/api';
import { Game } from '../../src/types';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDateTabs() {
  const today = new Date();
  const tabs: { label: string; sub: string; dateStr: string }[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatDate(d);
    let label = '';
    if (i === 0) label = '오늘';
    else if (i === -1) label = '어제';
    else if (i === 1) label = '내일';
    else {
      const DOW = ['일', '월', '화', '수', '목', '금', '토'];
      label = DOW[d.getDay()];
    }
    tabs.push({ label, sub: dateStr.slice(5).replace('-', '/'), dateStr });
  }
  return tabs;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '예정',
  LIVE: 'LIVE',
  FINAL: '종료',
  FINISHED: '종료',
  CANCELLED: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: Colors.textSub,
  LIVE: Colors.fail,
  FINAL: Colors.placeholder,
  FINISHED: Colors.placeholder,
  CANCELLED: Colors.placeholder,
};

function GameCard({ game }: { game: Game }) {
  const live = game.status === 'LIVE';
  const ended = game.status === 'FINAL' || game.status === 'FINISHED';
  const showScore = live || ended;

  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;
  const awayWin = ended && awayScore > homeScore;
  const homeWin = ended && homeScore > awayScore;

  return (
    <View style={[styles.card, live && styles.cardLive]}>
      <View style={styles.teams}>
        {/* 원정 */}
        <View style={styles.teamBlock}>
          <Text style={styles.emoji}>{game.awayTeam.emoji}</Text>
          <Text style={[styles.shortName, awayWin && styles.winnerName]}>
            {game.awayTeam.shortName}
          </Text>
        </View>

        {/* 가운데 */}
        <View style={styles.center}>
          {showScore ? (
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNum, awayWin && styles.scoreWinner]}>
                {awayScore}
              </Text>
              <Text style={styles.scoreSep}>:</Text>
              <Text style={[styles.scoreNum, homeWin && styles.scoreWinner]}>
                {homeScore}
              </Text>
            </View>
          ) : (
            game.startTime && (
              <Text style={styles.time}>{game.startTime.slice(0, 5)}</Text>
            )
          )}
          <View style={[styles.badge, { borderColor: STATUS_COLOR[game.status] }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[game.status] }]}>
              {live && game.inning != null
                ? `${game.inning}이닝`
                : STATUS_LABEL[game.status]}
            </Text>
          </View>
        </View>

        {/* 홈 */}
        <View style={[styles.teamBlock, styles.homeBlock]}>
          <Text style={styles.emoji}>{game.homeTeam.emoji}</Text>
          <Text style={[styles.shortName, homeWin && styles.winnerName]}>
            {game.homeTeam.shortName}
          </Text>
        </View>
      </View>

      <Text style={styles.stadium}>{game.stadium}</Text>
    </View>
  );
}

export default function ScheduleScreen() {
  const todayStr = formatDate(new Date());
  const DATE_TABS = buildDateTabs();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = useCallback(async (date: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<Game[]>(`/api/v1/games?date=${date}`);
      setGames(data ?? []);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames(selectedDate);
  }, [selectedDate, fetchGames]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGames(selectedDate, true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>경기 일정</Text>
      </View>

      {/* 날짜 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateTabsScroll}
        contentContainerStyle={styles.dateTabs}
      >
        {DATE_TABS.map(({ label, sub, dateStr }) => {
          const active = dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dateTab, active && styles.dateTabActive]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{label}</Text>
              <Text style={[styles.dateSub, active && styles.dateSubActive]}>{sub}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>⚾</Text>
          <Text style={styles.emptyText}>이 날은 경기가 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => <GameCard game={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 15, fontWeight: '800', color: Colors.dark },

  dateTabsScroll: { flexGrow: 0, flexShrink: 0 },
  dateTabs: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    alignItems: 'center',
  },
  dateTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    minWidth: 52,
  },
  dateTabActive: { backgroundColor: Colors.primary },
  dateLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSub },
  dateLabelActive: { color: Colors.white },
  dateSub: { fontSize: 11, color: Colors.placeholder, marginTop: 2 },
  dateSubActive: { color: Colors.accentLight },

  list: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSub },

  card: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  cardLive: { borderColor: Colors.fail },
  teams: { flexDirection: 'row', alignItems: 'center' },
  teamBlock: { flex: 1, alignItems: 'center', gap: 4 },
  homeBlock: { flex: 1, alignItems: 'center' },
  emoji: { fontSize: 26 },
  shortName: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  winnerName: { fontWeight: '800', color: Colors.dark },
  center: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreNum: { fontSize: 22, fontWeight: '600', color: Colors.textSub, minWidth: 24, textAlign: 'center' },
  scoreWinner: { fontWeight: '800', color: Colors.dark },
  scoreSep: { fontSize: 16, fontWeight: '700', color: Colors.placeholder },
  badge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  time: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  stadium: { fontSize: 12, color: Colors.textSub, textAlign: 'center' },
});
