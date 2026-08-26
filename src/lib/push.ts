import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

/**
 * 푸시 알림 등록/해제.
 *
 * BE는 Expo Push Service로 발송한다(내부적으로 FCM/APNs 전달). 따라서 여기서 얻어야 하는 건
 * 네이티브 FCM 토큰이 아니라 **Expo push token**이다.
 *
 * 주의: 시뮬레이터/에뮬레이터는 원격 푸시를 받을 수 없어 실기기에서만 등록된다.
 */

// 앱이 켜져 있을 때도 알림을 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let cachedToken: string | null = null;

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

/** 권한 요청 → Expo push token 획득 → BE 등록. 실패해도 앱 흐름을 막지 않는다. */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('[push] 시뮬레이터에서는 원격 푸시를 받을 수 없어 등록을 건너뜁니다');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#6DBF45',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      console.log('[push] 알림 권한이 거부되어 등록하지 않습니다');
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      // EAS 프로젝트에 연결되지 않으면 Expo push token을 발급받을 수 없다
      console.warn('[push] EAS projectId가 없어 토큰을 발급할 수 없습니다. ' +
        'app.json의 extra.eas.projectId를 설정하세요 (eas init).');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token || token === cachedToken) return token ?? null;

    await api.post('/api/v1/users/me/devices', {
      pushToken: token,
      platform: Platform.OS,
    });
    cachedToken = token;
    console.log('[push] 기기 등록 완료');
    return token;
  } catch (e: any) {
    console.warn('[push] 등록 실패(무시하고 계속):', e?.message ?? e);
    return null;
  }
}

/** 로그아웃 시 해제 — 다음 사용자에게 이전 계정 알림이 가는 것을 막는다 */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!cachedToken) return;
    await api.delete(`/api/v1/users/me/devices?pushToken=${encodeURIComponent(cachedToken)}`);
    cachedToken = null;
  } catch (e: any) {
    console.warn('[push] 해제 실패(무시):', e?.message ?? e);
  }
}
