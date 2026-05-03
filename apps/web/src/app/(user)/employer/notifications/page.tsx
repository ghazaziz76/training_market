'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, MessageSquare, FileText, Radio } from 'lucide-react';
import { Card, Button, Spinner, EmptyState } from '@/components/ui';
import { formatRelativeTime } from '@/lib/format';
import { useNotificationStore } from '@/stores/notifications';
import { api } from '@/lib/api';

const typeIcons: Record<string, React.ReactNode> = {
  enquiry_reply: <MessageSquare className="h-5 w-5 text-blue-500" />,
  enquiry_received: <MessageSquare className="h-5 w-5 text-blue-500" />,
  proposal_received: <FileText className="h-5 w-5 text-green-500" />,
  proposal_shortlisted: <FileText className="h-5 w-5 text-purple-500" />,
  proposal_selected: <FileText className="h-5 w-5 text-emerald-500" />,
  proposal_rejected: <FileText className="h-5 w-5 text-red-500" />,
  broadcast_new: <Radio className="h-5 w-5 text-indigo-500" />,
};

export default function EmployerNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchNotifications } = useNotificationStore();

  const load = () => {
    api.get('/notifications?limit=50').then((res) => {
      setNotifications((res.data as any) || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await api.put(`/notifications/${id}/read`, {});
    setNotifications((prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));
    fetchNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    fetchNotifications();
  };

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await api.put(`/notifications/${n.notification_id}/read`, {});
      setNotifications((prev) => prev.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: true } : x));
      fetchNotifications();
    }
    if (n.action_url) {
      router.push(n.action_url);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-foreground-muted">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} leftIcon={<CheckCheck className="h-4 w-4" />}>
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.notification_id}
              hover
              clickable
              className={`transition-colors cursor-pointer ${!n.is_read ? 'border-l-4 border-l-user-primary bg-user-primary/5' : ''}`}
              onClick={() => handleClick(n)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {typeIcons[n.type] || <Bell className="h-5 w-5 text-foreground-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-sm text-foreground-muted mt-0.5">{n.message}</p>
                  <p className="text-xs text-foreground-subtle mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => markRead(n.notification_id, e)}
                    className="flex-shrink-0 rounded p-1.5 text-foreground-muted hover:bg-background-subtle hover:text-foreground"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
