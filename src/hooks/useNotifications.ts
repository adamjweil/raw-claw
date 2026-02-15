import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
  getStoredNotifications,
  markNotificationRead,
  clearNotifications,
} from '../services/notifications';
import { Notification as PawNotification } from '../types';

interface UseNotificationsResult {
  notifications: PawNotification[];
  unreadCount: number;
  unreadByCategory: Record<string, number>;
  markRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<PawNotification[]>([]);

  const refresh = useCallback(async () => {
    const stored = await getStoredNotifications();
    setNotifications(stored);
  }, []);

  useEffect(() => {
    refresh();

    // Refresh when a notification arrives
    const sub = Notifications.addNotificationReceivedListener(() => {
      // Small delay to let the save complete
      setTimeout(refresh, 500);
    });

    return () => {
      sub.remove();
    };
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const unreadByCategory = notifications
    .filter((n) => !n.read)
    .reduce<Record<string, number>>((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1;
      return acc;
    }, {});

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await refresh();
    },
    [refresh]
  );

  const clearAll = useCallback(async () => {
    await clearNotifications();
    setNotifications([]);
    await Notifications.setBadgeCountAsync(0);
  }, []);

  // Update app badge
  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    unreadByCategory,
    markRead,
    clearAll,
    refresh,
  };
}

