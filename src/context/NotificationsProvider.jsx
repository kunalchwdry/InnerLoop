import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

const NotificationsContext = createContext(null);

export const useNotifications = () => useContext(NotificationsContext);

export default function NotificationsProvider({ children }) {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const fireBrowser = useCallback((n) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      const note = new Notification(n.title || 'InnerLoop', {
        body: n.content || '',
        tag: n.id,
      });
      note.onclick = () => {
        window.focus();
        if (n.action_url) window.location.href = n.action_url;
        note.close();
      };
    } catch (e) {}
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticated || isLoadingAuth) return;
    try {
      const data = await db.entities.Notification.list('-created_at', 50);
      setNotifications(data);
    } catch (e) {} finally {
      setLoading(false);
    }
  }, [isAuthenticated, isLoadingAuth]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;
    const unsubscribe = db.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        setNotifications((prev) => [event.data, ...prev].slice(0, 50));
        fireBrowser(event.data);
      } else if (event.type === 'update') {
        setNotifications((prev) => prev.map((n) => (n.id === event.data.id ? event.data : n)));
      } else if (event.type === 'delete') {
        setNotifications((prev) => prev.filter((n) => n.id !== event.id));
      }
    });
    return unsubscribe;
  }, [fireBrowser, isAuthenticated, isLoadingAuth]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const res = await Notification.requestPermission();
    setPermission(res);
    return res;
  }, []);

  const createNotification = useCallback(async (data) => {
    return db.entities.Notification.create(data);
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await db.entities.Notification.update(id, { read: true }); } catch (e) {}
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    for (const n of unread) {
      try { await db.entities.Notification.update(n.id, { read: true }); } catch (e) {}
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await db.entities.Notification.delete(id); } catch (e) {}
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        permission,
        loading,
        requestPermission,
        createNotification,
        markRead,
        markAllRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}