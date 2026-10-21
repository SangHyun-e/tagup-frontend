import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { Colors } from '../constants/colors';

/**
 * 푸시 알림 등록/해제.
 *
 * BE는 Expo Push Service로 발송한다(내부적으로 FCM/APNs 전달). 따라서 여기서 얻어야 하는 건
 * 네이티브 FCM 토큰이 아니라 **Expo push token**이다.
 *
 * 주의: 시뮬레이터/에뮬레이터는 원격 푸시를 받을 수 없어 실기기에서만 등록된다.
 *
 * 권한을 여기서 먼저 묻지 않는다. iOS 권한 창은 **한 번 거절하면 앱에서 다시 띄울 수 없다.**
 * 그래서 왜 필요한지 먼저 설명하는 화면(app/notifications.tsx)을 거치고, 거기서
 * {@link requestPushPermission} 를 부른 다음 이 함수로 토큰을 올린다.
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

/** 설명 화면을 이미 보여줬는지. 두 번 권유하지 않기 위해 기기에 남긴다 */
const ASKED_KEY = '@tagup/push_asked';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** 지금 권한 상태. 설정에서 바꿀 수 있으니 화면을 열 때마다 다시 읽어야 한다 */
export async function getPushPermission(): Promise<PushPermission> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

/** 설명 화면을 보여준 적이 있는지 */
export async function hasAskedForPush(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === 'true';
  } catch {
    // 저장소를 못 읽으면 물어본 것으로 친다 — 매번 권유하는 쪽이 더 나쁘다
    return true;
  }
}

export async function markPushAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, 'true');
  } catch {
    // 못 남겨도 흐름을 막지 않는다
  }
}

/**
 * OS 권한 창을 띄운다. 설명 화면에서만 부를 것.
 *
 * 허용되면 곧바로 토큰까지 등록한다.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  await markPushAsked();
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      return current.canAskAgain ? 'undetermined' : 'denied';
    }
    await registerPushToken();
    return 'granted';
  } catch (e: any) {
    console.warn('[push] 권한 요청 실패:', e?.message ?? e);
    return 'undetermined';
  }
}

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

/** 이미 허용된 경우에만 Expo push token 획득 → BE 등록. 실패해도 앱 흐름을 막지 않는다. */
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
        lightColor: Colors.primary,
      });
    }

    // 권한 창을 여기서 띄우지 않는다 — 이미 허용된 경우에만 토큰을 올린다
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[push] 알림 권한이 없어 등록하지 않습니다');
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
