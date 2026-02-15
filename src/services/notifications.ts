import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { type EventSubscription } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from './store';
import { NotificationSettings, Notification as PawNotification } from '../types';
import { router } from 'expo-router';

// ─── Storage Keys ───────────────────────────────────────────────────

const NOTIFICATION_SETTINGS_KEY = 'paw_notification_settings';
const NOTIFICATIONS_KEY = 'paw_notifications';
const PUSH_TOKEN_KEY = 'paw_push_token';

// ─── Default Settings ───────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  categories: {
    arb_alert: { push: true, sound: true, badge: true },
    cron_result: { push: true, sound: false, badge: true },
    reminder: { push: true, sound: true, badge: true },
    system: { push: true, sound: false, badge: true },
  },
  quietHours: {
    enabled: false,
    start: '23:00',
    end: '08:00',
  },
};

// ─── Configure notification handler ─────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const settings = await getNotificationSettings();
    const category = notification.request.content.data?.category as string | undefined;

    // Check quiet hours
    if (settings.quietHours.enabled && isQuietHours(settings.quietHours)) {
      const isCritical = category === 'arb_alert';
      if (!isCritical) {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: true, // still count for badge
        };
      }
    }

    // Check per-category settings
    const catSettings = category ? settings.categories[category] : undefined;
    const shouldShow = catSettings?.push ?? true;

    return {
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
      shouldPlaySound: catSettings?.sound ?? false,
      shouldSetBadge: catSettings?.badge ?? true,
    };
  },
});

// ─── Quiet Hours ────────────────────────────────────────────────────

function isQuietHours(config: { start: string; end: string }): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = config.start.split(':').map(Number);
  const [endH, endM] = config.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g., 23:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

// ─── Settings Persistence ───────────────────────────────────────────

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // use defaults
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Notification Storage ───────────────────────────────────────────

export async function getStoredNotifications(): Promise<PawNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // empty
  }
  return [];
}

export async function saveNotification(notif: PawNotification): Promise<void> {
  const existing = await getStoredNotifications();
  const updated = [notif, ...existing].slice(0, 100); // keep latest 100
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

export async function markNotificationRead(id: string): Promise<void> {
  const existing = await getStoredNotifications();
  const updated = existing.map((n) => (n.id === id ? { ...n, read: true } : n));
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

export async function clearNotifications(): Promise<void> {
  await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
}

// ─── Push Token Registration ────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Configure Android notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('arb_alerts', {
        name: 'Arb Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('cron_results', {
        name: 'Cron Results',
        importance: Notifications.AndroidImportance.LOW,
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    return token;
  } catch {
    return null;
  }
}

// ─── Deep Linking ───────────────────────────────────────────────────

export function handleNotificationDeepLink(data: Record<string, unknown>): void {
  const deepLink = data?.deepLink as string | undefined;
  if (!deepLink) return;

  try {
    // Parse rawclaw:// URLs
    if (deepLink.startsWith('rawclaw://')) {
      const path = deepLink.replace('rawclaw://', '/');

      if (path.startsWith('/chat/')) {
        const sessionId = path.replace('/chat/', '');
        router.push({ pathname: '/(tabs)/chat', params: { sessionId } });
      } else if (path.startsWith('/automations/')) {
        const id = path.replace('/automations/', '');
        router.push({ pathname: '/automations/[id]', params: { id } });
      } else if (path === '/status') {
        router.push('/(tabs)/status');
      } else if (path.startsWith('/memory/')) {
        const name = path.replace('/memory/', '');
        router.push({ pathname: '/memory/[name]', params: { name } });
      }
    }
  } catch {
    // navigation failed
  }
}

// ─── Notification Manager Component ─────────────────────────────────

export function NotificationManager() {
  const { state } = useStore();
  const responseListener = useRef<EventSubscription | null>(null);
  const receivedListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Register push token when we have a client
    if (state.client) {
      registerForPushNotifications().then((token) => {
        if (token && state.client) {
          // Register with gateway
          state.client.registerPushToken(token).catch(() => {});
        }
      });
    }

    // Listen for notification taps (deep-linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data) {
          handleNotificationDeepLink(data as Record<string, unknown>);
        }
      }
    );

    // Listen for received notifications (store them locally)
    receivedListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        const pawNotif: PawNotification = {
          id: notification.request.identifier,
          category: (data?.category as PawNotification['category']) || 'system',
          title: notification.request.content.title || '',
          body: notification.request.content.body || '',
          read: false,
          timestamp: new Date().toISOString(),
          deepLink: data?.deepLink as string | undefined,
        };
        await saveNotification(pawNotif);
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (receivedListener.current) {
        receivedListener.current.remove();
      }
    };
  }, [state.client]);

  return null;
}

