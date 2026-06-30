import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors } from '../../src/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { appUser, reset } = useAuthStore();

  const myTeam = appUser?.team ?? null;

  const handleLogout = async () => {
    await signOut(auth);
    reset();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 프로필</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="person-circle" size={64} color={Colors.textSub} />
          <Text style={styles.nickname}>{appUser?.nickname ?? '-'}</Text>
          <Text style={styles.email}>{appUser?.email ?? '-'}</Text>
        </View>

        <View style={styles.teamRow}>
          {myTeam ? (
            <>
              <Text style={styles.teamEmoji}>{myTeam.emoji}</Text>
              <Text style={styles.teamName}>{myTeam.name}</Text>
            </>
          ) : (
            <>
              <Text style={styles.teamEmoji}>⚾</Text>
              <Text style={[styles.teamName, { color: Colors.textSub }]}>구단 미설정</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => router.push('/team-select')}
          >
            <Text style={styles.changeButtonText}>{myTeam ? '변경' : '설정'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  email: {
    fontSize: 13,
    color: Colors.textSub,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  teamEmoji: {
    fontSize: 28,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  changeButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSub,
  },
});
