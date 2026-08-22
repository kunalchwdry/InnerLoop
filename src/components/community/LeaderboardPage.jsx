import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import {
  Trophy,
  Flame,
  CheckSquare,
  Target,
  Users,
  Award,
  TrendingUp,
  Clock,
  Loader2,
  Star,
  Zap,
  Medal,
  Crown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const LEADERBOARD_TYPES = [
  { value: 'consistency', label: 'Consistency', icon: Flame, description: 'Longest current streaks' },
  { value: 'tasks', label: 'Tasks Completed', icon: CheckSquare, description: 'Most tasks completed' },
  { value: 'habits', label: 'Habit Streaks', icon: Target, description: 'Longest habit streaks' },
  { value: 'challenges', label: 'Challenges', icon: Trophy, description: 'Challenge completions' },
  { value: 'helpful', label: 'Helpful Answers', icon: Users, description: 'Most accepted answers' },
  { value: 'study_time', label: 'Study Hours', icon: Clock, description: 'Total focus time' },
];

const TIME_RANGES = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

function LeaderboardPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('consistency');
  const [timeRange, setTimeRange] = useState('week');

  const loadLeaderboard = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // In a real implementation, this would query a leaderboard view or compute from data
      // For now, we'll simulate with community profiles and their stats
      const profiles = await db.entities.CommunityProfile.filter({ 
        show_profile_to_public: true,
        show_in_leaderboards: true,
        _sort: '-posts_count', // Default sort
        _limit: 50 
      });
      
      // Transform to leaderboard format based on active type
      let sortedProfiles = [...profiles];
      
      switch (activeType) {
        case 'consistency':
          sortedProfiles.sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
          break;
        case 'tasks':
          sortedProfiles.sort((a, b) => (b.tasks_completed_count || 0) - (a.tasks_completed_count || 0));
          break;
        case 'habits':
          sortedProfiles.sort((a, b) => (b.habit_streak || 0) - (a.habit_streak || 0));
          break;
        case 'challenges':
          sortedProfiles.sort((a, b) => (b.challenges_completed || 0) - (a.challenges_completed || 0));
          break;
        case 'helpful':
          sortedProfiles.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
          break;
        case 'study_time':
          sortedProfiles.sort((a, b) => (b.total_study_hours || 0) - (a.total_study_hours || 0));
          break;
      }
      
      // Add rank
      const rankedProfiles = sortedProfiles.map((profile, index) => ({
        ...profile,
        rank: index + 1,
        // Simulated data for demo
        current_streak: profile.current_streak || Math.floor(Math.random() * 30),
        tasks_completed_count: profile.tasks_completed_count || Math.floor(Math.random() * 500),
        habit_streak: profile.habit_streak || Math.floor(Math.random() * 60),
        challenges_completed: profile.challenges_completed || Math.floor(Math.random() * 10),
        helpful_count: profile.helpful_count || Math.floor(Math.random() * 50),
        total_study_hours: profile.total_study_hours || Math.floor(Math.random() * 200),
      }));
      
      setLeaderboard(rankedProfiles.slice(0, 50));
      
      // Find my rank
      const myProfile = rankedProfiles.find(p => p.user_id === user.id);
      if (myProfile) {
        setMyRank(myProfile.rank);
      }
      
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, activeType, timeRange]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getMetricValue = (profile) => {
    switch (activeType) {
      case 'consistency': return profile.current_streak || 0;
      case 'tasks': return profile.tasks_completed_count || 0;
      case 'habits': return profile.habit_streak || 0;
      case 'challenges': return profile.challenges_completed || 0;
      case 'helpful': return profile.helpful_count || 0;
      case 'study_time': return profile.total_study_hours || 0;
      default: return 0;
    }
  };

  const getMetricLabel = () => {
    const type = LEADERBOARD_TYPES.find(t => t.value === activeType);
    return type?.label || 'Score';
  };

  const getMedal = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="w-6 h-6 text-muted-foreground font-bold">{rank}</span>;
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Community Leaderboards</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            See how you rank among fellow students. Compete on consistency, not just hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 p-6 sm:p-8 border border-border/60"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Leaderboards
            </h1>
            <p className="text-muted-foreground mt-1">
              Rankings based on consistency and achievement, not just raw hours
            </p>
          </div>
          {myRank && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 text-primary rounded-xl">
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Your Rank: #{myRank}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Leaderboard Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {LEADERBOARD_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setActiveType(type.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors whitespace-nowrap",
              activeType === type.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            title={type.description}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Time Range */}
      <div className="flex gap-2 mb-4">
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setTimeRange(range.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl transition-colors",
              timeRange === range.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_80px_100px_100px] px-4 py-3 bg-muted/50 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Rank</span>
          <span className="flex items-center gap-2">Student</span>
          <span className="text-center">{getMetricLabel()}</span>
          <span className="text-center">Streak</span>
          <span className="text-center">Level</span>
        </div>

        {/* Leaderboard Rows */}
        {loading ? (
          <div className="space-y-4 p-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No data available</h3>
            <p className="text-muted-foreground">Leaderboard will populate as community members participate.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {leaderboard.map((profile, index) => (
              <LeaderboardRow
                key={profile.user_id}
                profile={profile}
                rank={index + 1}
                metricValue={getMetricValue(profile)}
                isCurrentUser={profile.user_id === user.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* My Stats Card */}
      {myRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-6 border border-border/60"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Consistency Rank" value={`#${leaderboard.find(p => p.user_id === user.id)?.rank || 'N/A'}`} icon={Trophy} />
            <StatCard label="Current Streak" value={`${leaderboard.find(p => p.user_id === user.id)?.current_streak || 0} days`} icon={Flame} />
            <StatCard label="Tasks Done" value={`${leaderboard.find(p => p.user_id === user.id)?.tasks_completed_count || 0}`} icon={CheckSquare} />
            <StatCard label="Helpful Answers" value={`${leaderboard.find(p => p.user_id === user.id)?.helpful_count || 0}`} icon={Users} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LeaderboardRow({ profile, rank, metricValue, isCurrentUser }) {
  const getLevel = (score) => {
    if (score >= 100) return { label: 'Legend', color: 'text-yellow-500 bg-yellow-500/10' };
    if (score >= 50) return { label: 'Expert', color: 'text-purple-500 bg-purple-500/10' };
    if (score >= 20) return { label: 'Pro', color: 'text-blue-500 bg-blue-500/10' };
    if (score >= 10) return { label: 'Rising', color: 'text-green-500 bg-green-500/10' };
    return { label: 'Beginner', color: 'text-gray-500 bg-gray-500/10' };
  };

  const level = getLevel(metricValue);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "grid grid-cols-[40px_1fr_80px_100px_100px] px-4 py-3 items-center transition-colors",
        isCurrentUser && "bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-center">
        {getMedal(rank)}
      </div>
      
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-sm">
            {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {profile.display_name || profile.username || 'Student'}
            {isCurrentUser && <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">You</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        </div>
      </div>
      
      <div className="text-center font-bold text-lg text-foreground">{metricValue}</div>
      
      <div className="text-center">
        <span className={cn(
          "px-2 py-1 text-xs font-medium rounded-full",
          (profile.current_streak || 0) >= 7 ? "bg-green-500/10 text-green-500" :
          (profile.current_streak || 0) >= 3 ? "bg-blue-500/10 text-blue-500" :
          "bg-muted text-muted-foreground"
        )}>
          {(profile.current_streak || 0)} 🔥
        </span>
      </div>
      
      <div className="text-center">
        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", level.color)}>
          {level.label}
        </span>
      </div>
    </motion.div>
  );
}

function getMedal(rank) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
  return <span className="w-6 h-6 text-muted-foreground font-bold">{rank}</span>;
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="p-4 bg-card border border-border/60 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-primary" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default LeaderboardPage;