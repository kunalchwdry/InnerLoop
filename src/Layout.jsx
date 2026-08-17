import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/lib/utils';

import {
  LayoutDashboard,
  Calendar,
  Target,
  Moon,
  Clock,
  Dumbbell,
  ListTodo,
  MessageCircle,
  Menu,
  X,
  LogOut,
  User,
  Sun,
  TrendingUp,
  Settings,
  Bell,
  Send,
  BookOpen,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeProvider, useTheme } from '@/context/ThemeProvider';
import NotificationsProvider from '@/context/NotificationsProvider';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';

const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Analytics', icon: TrendingUp, page: 'Analytics' },
  { name: 'Calendar', icon: Calendar, page: 'Calendar' },
  { name: 'Habits', icon: Target, page: 'Habits' },
  { name: 'Sleep', icon: Moon, page: 'Sleep' },
  { name: 'Timetable', icon: Clock, page: 'TimetableDay' },
  { name: 'Exercise', icon: Dumbbell, page: 'Exercise' },
  { name: 'Tasks', icon: ListTodo, page: 'Tasks' },
  { name: 'AI Assistant', icon: MessageCircle, page: 'Assistant' },
  { name: 'Notifications', icon: Bell, page: 'Notifications' },
  { name: 'Connect', icon: Send, page: 'Connect' },
  { name: 'Learning', icon: BookOpen, page: 'Learning' },
  { name: 'HyperFocus', icon: Zap, page: 'HyperFocus' },
  { name: 'Community', icon: Users, page: 'Community' },
];

function SidebarLink({ item, isActive, onClick }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-muted border border-border/60 shadow-soft"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center">
        <item.icon className="w-[18px] h-[18px]" />
      </span>
      <span className="relative z-10 text-sm font-medium">{item.name}</span>
    </Link>
  );
}

function SidebarContent({ currentPageName, onNavigate, user, theme, toggleTheme, handleLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 pt-7 pb-6">
        <Link to={createPageUrl('Dashboard')} onClick={onNavigate} className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-glow transition-shadow">
            <span className="text-white font-bold text-base">IL</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">InnerLoop</span>
        </Link>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink
            key={item.page}
            item={item}
            isActive={currentPageName === item.page}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* User Section */}
      <div className="px-3 pb-5 pt-4 border-t border-border/60 space-y-2">
        <Link
          to={createPageUrl('Settings')}
          onClick={onNavigate}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
            currentPageName === 'Settings' ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {currentPageName === 'Settings' && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-xl bg-muted border border-border/60 shadow-soft"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Settings className="relative z-10 w-[18px] h-[18px]" />
          <span className="relative z-10 text-sm font-medium">Settings</span>
        </Link>

        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-rose-505 hover:bg-rose-500/5 rounded-xl transition-all"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span className="font-medium">Log out</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => db.auth.redirectToLogin()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-xl transition-colors font-medium shadow-soft"
          >
            Sign In
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-all"
        >
          {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </div>
  );
}

function LayoutContent({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    db.auth.logout();
  };

  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-panel">
        <div className="flex items-center justify-between px-5 h-16">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-xs">IL</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">InnerLoop</span>
          </Link>
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-card border-r border-border/60"
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-5 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              currentPageName={currentPageName}
              onNavigate={() => setSidebarOpen(false)}
              user={user}
              theme={theme}
              toggleTheme={toggleTheme}
              handleLogout={handleLogout}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-30 h-full w-[260px] flex-col bg-card border-r border-border/60">
        <SidebarContent
          currentPageName={currentPageName}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[260px] min-h-screen pt-16 lg:pt-0">
        <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <LayoutContent children={children} currentPageName={currentPageName} />
      </NotificationsProvider>
    </ThemeProvider>
  );
}