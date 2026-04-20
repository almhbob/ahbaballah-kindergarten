import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'push_expo_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.warn('[Notifications] Push only works on real devices');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'إشعارات روضة أحباب الله',
        importance: Notifications.AndroidImportance.MAX,
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
  if (Platform.OS === 'web') return;
  const trigger = delaySeconds > 0
    ? ({ seconds: delaySeconds } as Notifications.NotificationTriggerInput)
    : (null as unknown as Notifications.NotificationTriggerInput);
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function usePushNotificationListener(
  onReceive?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
) {
  const receiveRef = Notifications.useLastNotificationResponse();
  return { receiveRef };
}

export async function sendLocalNotificationNow(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
}
