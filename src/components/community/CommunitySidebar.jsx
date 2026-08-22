import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  MessageSquare,
  HelpCircle,
  Trophy,
  Target,
  BookOpen,
  GraduationCap,
  Shield,
  Settings,
  User,
  Zap,
  Flag,
  Star,
  TrendingUp,
  Plus
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, description: 'Your personalized feed' },
  { id: 'communities', label: 'Communities', icon: Users, description: 'Study groups & communities' },
  { id: 'posts', label: 'All Posts', icon: MessageSquare, description: 'Browse all discussions' },
  { id: 'challenges', label: 'Challenges', icon: Flag, description: 'Community challenges & streaks' },
  { id: 'qa', label: 'Q&A', icon: HelpCircle, description: 'Ask & answer questions' },
  { id: 'accountability', label: 'Accountability', icon: Target, description: 'Find study partners' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, description: 'Top contributors' },
  { id: 'resources', label: 'Resources', icon: BookOpen, description: 'Notes, roadmaps & more' },
  { id: 'mentorship', label: 'Mentorship', icon: GraduationCap, description: 'Learn from experts' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, description: 'Direct messages' },
  { id: 'profile', label: 'My Profile', icon: User, description: 'Your community profile' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Privacy & notifications' },
];

export function CommunitySidebar({ activeTab, setActiveTab, myCommunities, onClose, user }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-7 pb-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">Community</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); onClose?.(); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group",
              activeTab === item.id 
                ? "text-foreground bg-muted/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            title={item.description}
          >
            <span className="relative z-10 flex items-center justify-center">
              <item.icon className="w-[18px] h-[18px]" />
            </span>
            <span className="relative z-10 text-sm font-medium flex-1 text-left">{item.label}</span>
            {activeTab === item.id && (
              <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      {/* My Communities Quick Access */}
      {myCommunities && myCommunities.length > 0 && (
        <div className="px-3 pb-5 pt-4 border-t border-border/60 space-y-2">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            My Communities
          </h3>
          {myCommunities.slice(0, 5).map((community) => (
            <button
              key={community.id}
              onClick={() => { 
                setActiveTab('communities'); 
                onClose?.(); 
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", community.color || "bg-primary/10 text-primary")}>
                {community.icon || community.name.charAt(0)}
              </div>
              <span className="truncate font-medium">{community.name}</span>
            </button>
          ))}
          {myCommunities.length > 5 && (
            <button
              onClick={() => { setActiveTab('communities'); onClose?.(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <span>+ {myCommunities.length - 5} more</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-3 pb-5 pt-4 border-t border-border/60 space-y-2">
        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h3>
        <button
          onClick={() => { setActiveTab('home'); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Post</span>
        </button>
        <button
          onClick={() => { setActiveTab('challenges'); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Zap className="w-5 h-5" />
          <span>Join a Challenge</span>
        </button>
        <button
          onClick={() => { setActiveTab('accountability'); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Target className="w-5 h-5" />
          <span>Find Accountability Partner</span>
        </button>
      </div>
    </div>
  );
}