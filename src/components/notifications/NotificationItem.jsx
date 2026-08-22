import React from 'react';
import { Clock, Trophy, AlertTriangle, Info, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  info: { icon: Info, tone: 'bg-blue-500' },
  reminder: { icon: Clock, tone: 'bg-amber-500' },
  achievement: { icon: Trophy, tone: 'bg-emerald-500' },
  warning: { icon: AlertTriangle, tone: 'bg-rose-500' },
};

export default function NotificationItem({ notification, onMarkRead, onDelete, compact }) {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl transition-colors",
        compact ? "p-2.5 hover:bg-muted/60" : "p-4 bg-card border border-border/60 shadow-soft",
        !notification.read && (compact ? "bg-blue-50/50 dark:bg-blue-500/5" : "bg-blue-50/40 dark:bg-blue-500/5")
      )}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0", cfg.tone)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm text-foreground leading-tight">{notification.title}</p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notification.content && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.content}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {notification.created_date
              ? formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })
              : ''}
          </span>
          <div className="flex items-center gap-1">
            {!notification.read && onMarkRead && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Mark as read"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(notification.id)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}