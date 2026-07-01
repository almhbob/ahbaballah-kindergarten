import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';

const TOKEN_KEY = 'push_expo_token';
const EAS_PROJECT_ID = 'd2a8ce35-17b6-4dc9-92ab-d6a849ad5336';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'روضة احباب الله',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c9952a',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
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
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: delaySeconds >= 1
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds }
        : null,
    });
  } catch (e) {
    console.log('[Notifications] schedule error:', e);
  }
}

export async function sendLocalNotificationNow(title: string, body: string): Promise<void> {
  await scheduleLocalNotification(title, body, 0);
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

export function usePushNotificationListener(
  onReceive?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
) {
  const receiveRef = useRef<Notifications.EventSubscription | null>(null);
  const responseRef = useRef<Notifications.EventSubscription | null>(null);
  const onReceiveRef = useRef(onReceive);
  const onResponseRef = useRef(onResponse);
  onReceiveRef.current = onReceive;
  onResponseRef.current = onResponse;

  useEffect(() => {
    if (onReceive)  receiveRef.current  = Notifications.addNotificationReceivedListener(n => onReceiveRef.current?.(n));
    if (onResponse) responseRef.current = Notifications.addNotificationResponseReceivedListener(r => onResponseRef.current?.(r));
    return () => { receiveRef.current?.remove(); responseRef.current?.remove(); };
  }, []);

  return { receiveRef };
}
