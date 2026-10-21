import { useEffect, useRef } from 'react';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/useAuthStore';
import { getPushPermission, hasAskedForPush, registerPushToken } from '../src/lib/push';
import { FontAssets } from '../src/constants/theme';

export default function RootLayout() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const registered = useRef(false);
  // 화면이 아직 붙기 전에 router.push 를 부르면 조용히 버려진다.
  // 앱을 껐다 켠 직후가 바로 그 상황이라, 네비게이션이 준비된 뒤에 움직인다
  const navigationState = useRootNavigationState();
  const navigationReady = !!navigationState?.key;

  // Pretendard 를 싣는다. 실패하더라도 화면은 띄운다 — 폰트 하나 때문에 앱이 멈추면 안 된다.
  // (기기 기본 폰트로 그려질 뿐이고, 그게 지금까지의 모습이었다)
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  // 로그인이 끝난 뒤(= appUser 확보) 한 번만 처리.
  // 등록 API가 인증을 요구하므로 로그인 이전에 호출하면 안 된다.
  //
  // 이미 허용했으면 조용히 토큰만 올린다. 아직 묻지 않았다면 OS 권한 창을 바로 띄우지 않고
  // 왜 필요한지 설명하는 화면을 먼저 보여준다 — iOS 권한 창은 한 번 거절당하면 끝이다.
  useEffect(() => {
    if (!appUser || !navigationReady || registered.current) return;
    registered.current = true;
    (async () => {
      const permission = await getPushPermission();
      if (permission === 'granted') {
        registerPushToken();
        return;
      }
      if (permission === 'undetermined' && !(await hasAskedForPush())) {
        router.push('/notifications');
      }
    })();
  }, [appUser, navigationReady, router]);

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

  if (!fontsLoaded && !fontError) return null;

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
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
