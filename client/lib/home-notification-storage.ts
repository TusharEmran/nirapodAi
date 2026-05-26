import * as SecureStore from 'expo-secure-store';

export type HomeNotificationKind = 'info' | 'success' | 'warning' | 'error';

export type HomeNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  kind: HomeNotificationKind;
};

const NOTIFICATION_KEY = 'nirapodai.home.notifications';
const MAX_NOTIFICATIONS = 20;

export async function loadHomeNotifications() {
  const rawValue = await SecureStore.getItemAsync(NOTIFICATION_KEY);

  if (!rawValue) {
    return [] as HomeNotification[];
  }

  try {
    const parsed = JSON.parse(rawValue) as HomeNotification[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : [];
  } catch {
    return [] as HomeNotification[];
  }
}

export async function saveHomeNotifications(notifications: HomeNotification[]) {
  await SecureStore.setItemAsync(NOTIFICATION_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
}
