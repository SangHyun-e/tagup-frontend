import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LogoBubble from '../../assets/images/tagup_logo_bubble.svg';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';
import { User } from '../types';

export default function SplashScreen() {
  const router = useRouter();
  const { setFirebaseUser, setAppUser, setLoading } = useAuthStore();

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));

    const authCheck = new Promise<{ isLoggedIn: boolean; isFirstLaunch: boolean }>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        setFirebaseUser(user);
        setLoading(false);
        const onboarded = await AsyncStorage.getItem('onboarding_done');

        if (user) {
          try {
            const nickname = user.displayName ?? user.email?.split('@')[0] ?? 'user';
            // teamId 전달하지 않아 BE가 기존 팀 정보를 덮어쓰지 않도록 nickname만 전달
            const appUser = await api.post<User>('/api/v1/auth/sync', { nickname });
            setAppUser(appUser);
          } catch {
            // sync 실패해도 Firebase 인증 상태로 진입 허용
          }
        }

        resolve({ isLoggedIn: !!user, isFirstLaunch: !onboarded });
      });
    });

    Promise.all([minDelay, authCheck]).then(([, { isLoggedIn, isFirstLaunch }]) => {
      if (!isLoggedIn) {
        router.replace(isFirstLaunch ? '/onboarding' : '/login');
      } else {
        router.replace('/(tabs)');
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <LogoBubble width={80} height={80} />
      <Text style={styles.title}>태그업</Text>
      <Text style={styles.slogan}>같이 보는 야구의 맛</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 0,
  },
  slogan: {
    fontSize: 11,
    color: Colors.textSub,
    fontStyle: 'italic',
  },
});
