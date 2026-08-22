import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import {
  Flag,
  Target,
  Code,
  BookOpen,
  CheckSquare,
  Terminal,
  Sunrise,
  Users,
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Loader2,
  Plus,
  ArrowRight,
  BarChart2,
  Calendar,
  Star,
  Zap,
  CheckCircle,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

const CHALLENGE_CATEGORIES = [
  { value: 'all', label: 'All', icon: Flag },
  { value: 'focus', label: 'Focus', icon: Target, color: 'text-blue-500' },
  { value: 'dsa', label: 'DSA', icon: Code, color: 'text-green-500' },
  { value: 'habit', label: 'Habits', icon: BookOpen, color: 'text-purple-500' },
  { value: 'productivity', label: 'Productivity', icon: CheckSquare, color: 'text-orange-500' },
  { value: 'learning', label: 'Learning', icon: BookOpen, color: 'text-indigo-500' },
  { value: 'coding', label: 'Coding', icon: Terminal, color: 'text-teal-500' },
];

function ChallengesPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  
  const [templates, setTemplates] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('available'); // available, my, completed
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    name: '',
    description: '',
    rules: '',
    category: 'focus',
    daily_target_type: 'focus_minutes',
    daily_target_value: 30,
    duration_days: 7,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    community_id: null,
    visibility: 'public',
    require_approval: false,
  });

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Load challenge templates
      const templatesData = await db.entities.ChallengeTemplate.filter({ 
        is_active: true, 
        _sort: '-is_featured,-created_at' 
      });
      setTemplates(templatesData || []);
      
      // Load user's challenge participations
      const participations = await db.entities.ChallengeParticipant.filter({ 
        user_id: user.id 
      });
      
      // Get challenge details for each participation
      const challengesData = await Promise.all(
        participations.map(async (p) => {
          const challenge = await db.entities.Challenge.get(p.challenge_id);
          return { ...p, challenge };
        })
      );
      
      const active = challengesData.filter(c => c.status === 'active' && c.challenge?.status === 'active');
      const completed = challengesData.filter(c => c.status === 'completed' || c.is_completed);
      const available = challengesData.filter(c => c.status === 'active' && c.challenge?.status === 'active');
      
      setMyChallenges(challengesData);
      setActiveChallenges(active);
      setCompletedChallenges(completed);
      
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoinChallenge = async (challengeId) => {
    try {
      // Check if already joined
      const existing = await db.entities.ChallengeParticipant.filter({ 
        challenge_id: challengeId, 
        user_id: user.id 
      });
      if (existing.length > 0) return;
      
      await db.entities.ChallengeParticipant.create({
        challenge_id: challengeId,
        user_id: user.id,
        status: 'active',
      });
      
      // Notify user
      try {
        await createNotification({
          title: 'Challenge Joined!',
          content: 'You have successfully joined the challenge. Good luck!',
          type: 'achievement',
          action_url: '/community?tab=challenges',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      loadData();
      setShowJoinModal(false);
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallenge.name.trim()) return;
    
    // Validate dates
    if (new Date(newChallenge.end_date) < new Date(newChallenge.start_date)) {
      try {
        await createNotification({
          title: 'Invalid Dates',
          content: 'End date must be after start date.',
          type: 'warning',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      return;
    }
    
    setCreatingChallenge(true);
    try {
      // Create the challenge using the db entity
      const challengeData = {
        name: newChallenge.name,
        description: newChallenge.description,
        category: newChallenge.category,
        daily_target_type: newChallenge.daily_target_type,
        daily_target_value: newChallenge.daily_target_value,
        duration_days: newChallenge.duration_days,
        start_date: newChallenge.start_date,
        end_date: newChallenge.end_date,
        community_id: newChallenge.community_id || null,
        visibility: newChallenge.visibility,
        require_approval: newChallenge.require_approval,
        status: new Date(newChallenge.start_date) <= new Date() ? 'active' : 'upcoming',
      };
      
      const created = await db.entities.Challenge.create(challengeData);
      
      // Notify user
      try {
        await createNotification({
          title: 'Challenge Created!',
          content: 'Your challenge has been created successfully.',
          type: 'achievement',
          action_url: '/community?tab=challenges',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      // Reset form
      setNewChallenge({
        name: '',
        description: '',
        rules: '',
        category: 'focus',
        daily_target_type: 'focus_minutes',
        daily_target_value: 30,
        duration_days: 7,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        community_id: null,
        visibility: 'public',
        require_approval: false,
      });
      
      setShowCreateChallenge(false);
      loadData();
    } catch (error) {
      console.error('Error creating challenge:', error);
      try {
        await createNotification({
          title: 'Error',
          content: 'Failed to create challenge. Please try again.',
          type: 'warning',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
    } finally {
      setCreatingChallenge(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days left`;
    return date.toLocaleDateString();
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'text-green-500';
    if (percentage >= 75) return 'text-blue-500';
    if (percentage >= 50) return 'text-yellow-500';
    if (percentage >= 25) return 'text-orange-500';
    return 'text-red-500';
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
          <Flag className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Join Community Challenges</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Build streaks, compete with friends, and achieve your goals together.
          </p>
        </motion.div>
      </div>
    );
  }

  const filteredTemplates = activeFilter === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeFilter);

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
              Community Challenges
            </h1>
            <p className="text-muted-foreground mt-1">
              Build streaks, stay consistent, and grow together
            </p>
          </div>
          <button
            onClick={() => setShowCreateChallenge(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-soft self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create Challenge</span>
          </button>
        </div>
      </motion.div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CHALLENGE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors whitespace-nowrap",
              activeFilter === cat.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <cat.icon className={cn("w-4 h-4", cat.color)} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/60">
        {[
          { id: 'available', label: 'Available', icon: Flag, count: filteredTemplates.length },
          { id: 'my', label: 'My Challenges', icon: Target, count: activeChallenges.length },
          { id: 'completed', label: 'Completed', icon: Trophy, count: completedChallenges.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl transition-colors -mb-px border-b-2",
              activeTab === tab.id
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'available' && (
          <AvailableChallengesTab
            key="available"
            templates={filteredTemplates}
            myChallenges={myChallenges}
            onJoin={handleJoinChallenge}
            loading={loading}
          />
        )}
        
        {activeTab === 'my' && (
          <MyChallengesTab
            key="my"
            activeChallenges={activeChallenges}
            myChallenges={myChallenges}
            loading={loading}
            user={user}
          />
        )}
        
        {activeTab === 'completed' && (
          <CompletedChallengesTab
            key="completed"
            completedChallenges={completedChallenges}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Join Modal */}
      {showJoinModal && selectedChallenge && (
        <JoinChallengeModal
          challenge={selectedChallenge}
          onJoin={handleJoinChallenge}
          onClose={() => setShowJoinModal(false)}
        />
      )}

      {/* Create Challenge Modal */}
      {showCreateChallenge && (
        <CreateChallengeModal
          onClose={() => setShowCreateChallenge(false)}
          onSubmit={handleCreateChallenge}
          creating={creatingChallenge}
          newChallenge={newChallenge}
          setNewChallenge={setNewChallenge}
          myCommunities={myChallenges.filter(c => c.challenge?.community_id).map(c => c.challenge).filter(Boolean)}
        />
      )}
    </div>
  );
}

// Sub-components
function AvailableChallengesTab({ templates, myChallenges, onJoin, loading }) {
  const joinedChallengeIds = new Set(myChallenges.map(c => c.challenge_id));

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-64 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <Flag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No challenges available</h3>
        <p className="text-muted-foreground">Check back later for new challenges!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <ChallengeTemplateCard
          key={template.id}
          template={template}
          isJoined={joinedChallengeIds.has(template.id)}
          onJoin={onJoin}
        />
      ))}
    </div>
  );
}

function ChallengeTemplateCard({ template, isJoined, onJoin }) {
  const categoryInfo = CHALLENGE_CATEGORIES.find(c => c.value === template.category);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-soft h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", 
          categoryInfo ? `${categoryInfo.color} bg-[${categoryInfo.color.replace('text-','bg-')}/10]` : "bg-primary/10 text-primary"
        )}>
          <template.icon className="w-6 h-6" />
        </div>
        {template.is_featured && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
            <Star className="w-3 h-3" />
            Featured
          </span>
        )}
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {template.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full">
            #{tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {template.duration_days} days
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {template.daily_target_value} {template.daily_target_type.replace('_', ' ')}
        </span>
      </div>
      
      <div className="flex gap-2 mt-auto">
        {isJoined ? (
          <button className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium" disabled>
            Joined
          </button>
        ) : (
          <button
            onClick={() => onJoin(template.id)}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Join Challenge
          </button>
        )}
      </div>
    </motion.div>
  );
}

function MyChallengesTab({ activeChallenges, myChallenges, loading, user }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (activeChallenges.length === 0) {
    return (
      <div className="text-center py-16">
        <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No active challenges</h3>
        <p className="text-muted-foreground mb-6">Join a challenge to start building your streak!</p>
        <button onClick={() => setActiveTab('available')} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
          Browse Challenges
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeChallenges.map((participation) => (
        <ActiveChallengeCard key={participation.id} participation={participation} user={user} />
      ))}
    </div>
  );
}

function ActiveChallengeCard({ participation, user }) {
  const challenge = participation.challenge;
  const template = challenge?.template_id; // Would need to fetch template
  const progress = participation.completion_percentage || 0;
  const daysLeft = challenge ? Math.ceil((new Date(challenge.end_date) - new Date()) / 86400000) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{challenge?.name || challenge?.template_id}</h3>
            <p className="text-sm text-muted-foreground">Day {participation.total_days_active + 1} of {challenge?.duration_days}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{daysLeft > 0 ? `${daysLeft} days left` : 'Ending today'}</p>
          <p className="text-xs text-muted-foreground">Ends {challenge?.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'soon'}</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">Progress</span>
          <span className={cn("font-bold", getProgressColor(progress))}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-xl">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{participation.current_streak}</p>
          <p className="text-xs text-muted-foreground">Current Streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{participation.longest_streak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{participation.total_days_active}</p>
          <p className="text-xs text-muted-foreground">Days Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{participation.total_points}</p>
          <p className="text-xs text-muted-foreground">Points</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
          <Flame className="w-4 h-4" />
          Check In
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors">
          <BarChart2 className="w-4 h-4" />
          Details
        </button>
      </div>
    </motion.div>
  );
}

function CompletedChallengesTab({ completedChallenges, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (completedChallenges.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No completed challenges yet</h3>
        <p className="text-muted-foreground">Complete a challenge to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedChallenges.map((participation) => (
        <CompletedChallengeCard key={participation.id} participation={participation} />
      ))}
    </div>
  );
}

function CompletedChallengeCard({ participation }) {
  const challenge = participation.challenge;
  const completedDate = participation.completed_at ? new Date(participation.completed_at).toLocaleDateString() : 'Recently';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{challenge?.name || challenge?.template_id}</h3>
          <p className="text-sm text-muted-foreground">Completed on {completedDate}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              Longest streak: {participation.longest_streak} days
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {participation.total_points} points
            </span>
          </div>
        </div>
        <span className="px-3 py-1.5 text-sm bg-green-500/10 text-green-500 rounded-lg font-medium">
          Completed
        </span>
      </div>
    </motion.div>
  );
}

function JoinChallengeModal({ challenge, onJoin, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border/60 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Join Challenge</h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{challenge?.name || challenge?.template_id}</h3>
            <p className="text-muted-foreground mt-2">{challenge?.description}</p>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{challenge?.duration_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Target</span>
              <span className="font-medium">{challenge?.daily_target_value} {challenge?.daily_target_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium capitalize">{challenge?.category}</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors">
              Cancel
            </button>
            <button onClick={() => onJoin(challenge.id)} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
              Join Challenge
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateChallengeModal({ onClose, onSubmit, creating, newChallenge, setNewChallenge, myCommunities }) {
  const categories = [
    { value: 'focus', label: 'Focus', icon: Target, color: 'text-blue-500' },
    { value: 'dsa', label: 'DSA', icon: Code, color: 'text-green-500' },
    { value: 'habit', label: 'Habits', icon: BookOpen, color: 'text-purple-500' },
    { value: 'productivity', label: 'Productivity', icon: CheckSquare, color: 'text-orange-500' },
    { value: 'learning', label: 'Learning', icon: BookOpen, color: 'text-indigo-500' },
    { value: 'coding', label: 'Coding', icon: Terminal, color: 'text-teal-500' },
  ];
  
  const targetTypes = [
    { value: 'focus_minutes', label: 'Focus Minutes' },
    { value: 'tasks_completed', label: 'Tasks Completed' },
    { value: 'habits_completed', label: 'Habits Completed' },
    { value: 'dsa_problems', label: 'DSA Problems' },
    { value: 'study_hours', label: 'Study Hours' },
  ];
  
  const visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can find and join' },
    { value: 'community', label: 'Community Only', description: 'Only community members can join' },
    { value: 'private', label: 'Private', description: 'Invite only' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border/60 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Create Challenge</h2>
            <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Challenge Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Challenge Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newChallenge.name}
              onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
              placeholder="e.g., 7-Day Deep Work Challenge"
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={newChallenge.description}
              onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              placeholder="What is this challenge about? What will participants achieve?"
              rows={3}
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          
          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Rules / Instructions</label>
            <textarea
              value={newChallenge.rules}
              onChange={(e) => setNewChallenge({ ...newChallenge, rules: e.target.value })}
              placeholder="Any rules or instructions for participants..."
              rows={3}
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          
          {/* Category and Target Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={newChallenge.category}
                onChange={(e) => setNewChallenge({ ...newChallenge, category: e.target.value })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Daily Target Type</label>
              <select
                value={newChallenge.daily_target_type}
                onChange={(e) => setNewChallenge({ ...newChallenge, daily_target_type: e.target.value })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {targetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Daily Target Value and Duration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Daily Target Value</label>
              <input
                type="number"
                min="1"
                value={newChallenge.daily_target_value}
                onChange={(e) => setNewChallenge({ ...newChallenge, daily_target_value: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={newChallenge.duration_days}
                onChange={(e) => setNewChallenge({ ...newChallenge, duration_days: parseInt(e.target.value) || 7 })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          
          {/* Start and End Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={newChallenge.start_date}
                onChange={(e) => setNewChallenge({ ...newChallenge, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
              <input
                type="date"
                value={newChallenge.end_date}
                onChange={(e) => setNewChallenge({ ...newChallenge, end_date: e.target.value })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          
          {/* Community Association (optional) */}
          {myCommunities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Community (Optional)</label>
              <select
                value={newChallenge.community_id || ''}
                onChange={(e) => setNewChallenge({ ...newChallenge, community_id: e.target.value || null })}
                className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">None (Global Challenge)</option>
                {myCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Visibility</label>
            <select
              value={newChallenge.visibility}
              onChange={(e) => setNewChallenge({ ...newChallenge, visibility: e.target.value })}
              className="w-full px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {visibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Require Approval */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="require_approval"
              checked={newChallenge.require_approval}
              onChange={(e) => setNewChallenge({ ...newChallenge, require_approval: e.target.checked })}
              className="w-4 h-4 text-primary border-border/60 rounded focus:ring-primary/50"
            />
            <label htmlFor="require_approval" className="text-sm text-muted-foreground">
              Require approval before joining
            </label>
          </div>
          
          {/* Error/Success Messages would go here */}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newChallenge.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function getProgressColor(percentage) {
  if (percentage >= 100) return 'text-green-500';
  if (percentage >= 75) return 'text-blue-500';
  if (percentage >= 50) return 'text-yellow-500';
  if (percentage >= 25) return 'text-orange-500';
  return 'text-red-500';
}

export default ChallengesPage;