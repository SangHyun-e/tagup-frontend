import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LogoBubble from '../../assets/images/tagup_logo_bubble.svg';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';

export default function SplashScreen() {
  const router = useRouter();
  const { setFirebaseUser, setLoading } = useAuthStore();

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));

    const authCheck = new Promise<{ isLoggedIn: boolean; isFirstLaunch: boolean }>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        setFirebaseUser(user);
        setLoading(false);
        const onboarded = await AsyncStorage.getItem('onboarding_done');
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
