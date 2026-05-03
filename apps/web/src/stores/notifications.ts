import { create } from 'zustand';
import { api } from '@/lib/api';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  action_url: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<Notification[]>('/notifications');
      if (res.success && res.data) {
        const unreadCount = res.data.filter((n) => !n.is_read).length;
        set({ notifications: res.data, unreadCount, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    await api.put(`/notifications/${id}/read`, {});
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notification_id === id ? { ...n, is_read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.put('/notifications/read-all', {});
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
