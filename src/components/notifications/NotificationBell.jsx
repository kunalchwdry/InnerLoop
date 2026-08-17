import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationsProvider';
import NotificationItem from '@/components/notifications/NotificationItem';
import { createPageUrl } from '@/lib/utils';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-card rounded-3xl border border-border/60 shadow-premium overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors text-left"
              >
                <BellOff className="w-4 h-4 flex-shrink-0" />
                Enable browser notifications
              </button>
            )}

            <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Bell className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">You're all caught up</p>
                </div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    compact
                    onMarkRead={markRead}
                    onDelete={deleteNotification}
                  />
                ))
              )}
            </div>

            <div className="border-t border-border/60 p-2">
              <Link
                to={createPageUrl('Notifications')}
                onClick={() => setOpen(false)}
                className="block text-center text-sm font-medium text-primary py-2 hover:bg-muted rounded-xl transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}