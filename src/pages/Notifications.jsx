import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import { PageTransition, fadeUp, staggerContainer } from '@/components/common/motion';
import { useNotifications } from '@/context/NotificationsProvider';
import NotificationItem from '@/components/notifications/NotificationItem';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markRead,
    markAllRead,
    deleteNotification,
    loading,
  } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <PageTransition>
      <div className="space-y-6 max-w-3xl">
        <PageHeader title="Notifications" subtitle="Stay on top of your reminders and updates" />

        {permission !== 'granted' && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Browser notifications are off</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">Get desktop alerts while using other apps</p>
              </div>
            </div>
            <Button size="sm" onClick={requestPermission} className="bg-amber-500 hover:bg-amber-600 text-white">
              Enable
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-2xl">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-sm font-medium transition-all",
                  filter === f.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-foreground">No notifications</p>
            <p className="text-sm mt-1">You're all caught up</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {filtered.map((n) => (
              <motion.div key={n.id} variants={fadeUp}>
                <NotificationItem notification={n} onMarkRead={markRead} onDelete={deleteNotification} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}