/**
 * Notifications stub — expo-notifications remote push was removed from Expo Go
 * in SDK 53. This stub keeps the same API surface so all callers compile and
 * run without crashing. Real push notifications require a development build.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'push_expo_token';

export async function registerForPushNotifications(): Promise<string | null> {
  console.log('[Notifications] Push notifications require a development build (not Expo Go).');
  return null;
}

export async function getSavedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  _delaySeconds = 1,
): Promise<void> {
  console.log(`[Notification scheduled] ${title}: ${body}`);
}

export async function cancelAllNotifications(): Promise<void> {
  console.log('[Notifications] cancelAllNotifications — stub');
}

export function usePushNotificationListener(
  _onReceive?: (n: unknown) => void,
  _onResponse?: (r: unknown) => void,
) {
  return { receiveRef: null };
}

export async function sendLocalNotificationNow(title: string, body: string): Promise<void> {
  console.log(`[Notification now] ${title}: ${body}`);
}
