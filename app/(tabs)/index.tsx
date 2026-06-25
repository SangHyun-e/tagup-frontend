import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors } from '../../src/constants/colors';

export default function MainHomeScreen() {
  const router = useRouter();
  const { appUser, reset } = useAuthStore();

  const handleLogout = async () => {
    await signOut(auth);
    reset();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/tagup_logo_bubble.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
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
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
            <Ionicons name="flash" size={18} color={Colors.white} />
            <Text style={styles.primaryButtonText}>태그업 하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>태그코드 입장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 더그아웃</Text>
          <Text style={styles.sectionCount}>0</Text>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚾</Text>
          <Text style={styles.emptyText}>아직 참여 중인 더그아웃이 없어요.</Text>
          <Text style={styles.emptySubtext}>태그업 하기로 새 더그아웃을 만들어보세요!</Text>
        </View>
      </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSub,
    marginTop: -8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.textSub,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSub,
    textAlign: 'center',
  },
});
