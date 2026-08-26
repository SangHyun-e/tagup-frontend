import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/useAuthStore';
import { registerPushToken } from '../src/lib/push';

export default function RootLayout() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const registered = useRef(false);

  // 로그인이 끝난 뒤(= appUser 확보) 한 번만 기기 등록.
  // 등록 API가 인증을 요구하므로 로그인 이전에 호출하면 안 된다.
  useEffect(() => {
    if (!appUser || registered.current) return;
    registered.current = true;
    registerPushToken();
  }, [appUser]);

  // 알림을 탭하면 해당 더그아웃 채팅으로 이동
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.roomId) {
        router.push({ pathname: '/chat/[roomId]', params: { roomId: String(data.roomId) } });
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
