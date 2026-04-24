import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'push_expo_token';

type NotificationsModule = typeof import('expo-notifications');
let N: NotificationsModule | null = null;

try {
  N = require('expo-notifications') as NotificationsModule;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  });
} catch (_) {
  console.warn('[Notifications] expo-notifications not available in Expo Go (SDK 53+). Push notifications disabled.');
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!N) return null;
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.warn('[Notifications] Push only works on real devices');
    return null;
  }

  const { status: existing } = await N.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return null;
  }

  try {
    const tokenData = await N.getExpoPushTokenAsync();
    const token = tokenData.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'إشعارات نظم إدارة رياض الأطفال',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0c1155',
        sound: 'default',
      });
    }
    return token;
  } catch (err) {
    console.warn('[Notifications] Token error:', err);
    return null;
  }
}

export async function getSavedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds = 1,
): Promise<void> {
  if (!N) return;
  if (Platform.OS === 'web') return;
  const trigger = delaySeconds > 0
    ? ({ seconds: delaySeconds } as import('expo-notifications').NotificationTriggerInput)
    : null;
  await N.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: trigger as import('expo-notifications').NotificationTriggerInput,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

export function usePushNotificationListener(
  _onReceive?: (n: unknown) => void,
  _onResponse?: (r: unknown) => void,
) {
  const receiveRef = N ? N.useLastNotificationResponse() : null;
  return { receiveRef };
}

export async function sendLocalNotificationNow(title: string, body: string): Promise<void> {
  if (!N) {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }
  if (Platform.OS === 'web') {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }
  await N.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
}
