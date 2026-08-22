import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import {
  Search,
  UserPlus,
  Heart,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Flame,
  TrendingUp,
  Users,
  MoreHorizontal,
  Flag,
  Star,
  Loader2,
  Edit,
  Trash2,
  Smile,
  Zap,
  X
} from 'lucide-react';

const GOAL_CATEGORIES = [
  'DSA', 'AI/ML', 'Web Development', 'Mobile Development',
  'Data Science', 'DevOps', 'Cybersecurity', 'Cloud Computing',
  'Competitive Programming', 'Exams', 'Certifications',
  'Habits', 'Productivity', 'Language Learning', 'Other'
];

function AccountabilityPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  
  const [myProfile, setMyProfile] = useState(null);
  const [potentialPartners, setPotentialPartners] = useState([]);
  const [myPartners, setMyPartners] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('find'); // find, partners, requests
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    current_goal: '',
    goal_description: '',
    goal_category: 'DSA',
    goal_target: '',
    show_goal_publicly: true,
    show_progress_to_partners: true,
    show_streak_to_partners: true,
    allow_partner_requests: true,
  });

  // Load data
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Load accountability profile
      const profileData = await db.entities.AccountabilityProfile.filter({ user_id: user.id });
      if (profileData.length > 0) {
        setMyProfile(profileData[0]);
      }
      
      // Load my partnerships (accepted)
      const partnerships = await db.entities.AccountabilityPartner.filter({ 
        user_id: user.id, 
        status: 'accepted' 
      });
      setMyPartners(partnerships || []);
      
      // Load pending requests (received)
      const received = await db.entities.AccountabilityPartner.filter({ 
        partner_id: user.id, 
        status: 'pending' 
      });
      setPendingRequests(received || []);
      
      // Load sent requests
      const sent = await db.entities.AccountabilityPartner.filter({ 
        user_id: user.id, 
        status: 'pending' 
      });
      setSentRequests(sent || []);
      
      // Load potential partners (users with public goals in similar categories)
      if (profileData.length > 0 && profileData[0].goal_category) {
        const potentials = await db.entities.AccountabilityProfile.filter({ 
          goal_category: profileData[0].goal_category,
          show_goal_publicly: true,
          allow_partner_requests: true,
        });
        setPotentialPartners(potentials.filter(p => p.user_id !== user.id).slice(0, 10));
      }
      
    } catch (error) {
      console.error('Error loading accountability data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.current_goal.trim()) return;
    
    try {
      const data = {
        ...newGoal,
        user_id: user.id,
      };
      
      if (myProfile) {
        await db.entities.AccountabilityProfile.update(myProfile.id, data);
      } else {
        await db.entities.AccountabilityProfile.create(data);
      }
      setShowCreateGoal(false);
      loadData();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleSendRequest = async (partnerId) => {
    try {
      // Check if already requested
      const existing = await db.entities.AccountabilityPartner.filter({ 
        user_id: user.id, 
        partner_id: partnerId 
      });
      if (existing.length > 0) return;
      
      await db.entities.AccountabilityPartner.create({
        user_id: user.id,
        partner_id: partnerId,
        requested_by: user.id,
        status: 'pending',
      });
      
      // Notify the other user
      await createNotification({
        title: 'New Accountability Request',
        content: `${user.full_name || 'Someone'} wants to be your accountability partner!`,
        type: 'info',
        action_url: '/community?tab=accountability',
      });
      
      loadData();
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await db.entities.AccountabilityPartner.update(requestId, { 
        status: 'accepted', 
        responded_at: new Date().toISOString() 
      });
      loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await db.entities.AccountabilityPartner.update(requestId, { 
        status: 'declined', 
        responded_at: new Date().toISOString() 
      });
      loadData();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const handleEndPartnership = async (partnerId) => {
    try {
      const partnership = await db.entities.AccountabilityPartner.filter({ 
        user_id: user.id, 
        partner_id: partnerId,
        status: 'accepted'
      });
      if (partnership.length > 0) {
        await db.entities.AccountabilityPartner.update(partnership[0].id, { 
          status: 'ended' 
        });
      }
      loadData();
    } catch (error) {
      console.error('Error ending partnership:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
          <Target className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Find Your Accountability Partner</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Connect with students who share your goals. Keep each other motivated and on track.
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
              Accountability Partners
            </h1>
            <p className="text-muted-foreground mt-1">
              Find study partners, share goals, and stay motivated together
            </p>
          </div>
          {!myProfile && (
            <button
              onClick={() => setShowCreateGoal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-soft self-start"
            >
              <Target className="w-4 h-4" />
              <span>Set Your Goal</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* My Goal Card */}
      {myProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full font-medium">
                  {myProfile.goal_category}
                </span>
                {myProfile.show_goal_publicly && (
                  <span className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded-full">
                    Public
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{myProfile.current_goal}</h3>
              {myProfile.goal_description && (
                <p className="text-muted-foreground text-sm mb-2">{myProfile.goal_description}</p>
              )}
              {myProfile.goal_target && (
                <p className="text-sm text-foreground flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Target: {myProfile.goal_target}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  Streak: {myProfile.current_streak} days
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Longest: {myProfile.longest_streak} days
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Partners: {myProfile.partners_count}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setNewGoal({ ...myProfile }); setShowCreateGoal(true); }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex-shrink-0"
            >
              Edit Goal
            </button>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/60">
        {[
          { id: 'find', label: 'Find Partners', icon: UserPlus, count: potentialPartners.length },
          { id: 'partners', label: 'My Partners', icon: Users, count: myPartners.length },
          { id: 'requests', label: 'Requests', icon: Clock, count: pendingRequests.length + sentRequests.length },
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
        {activeTab === 'find' && (
          <FindPartnersTab
            key="find"
            potentialPartners={potentialPartners}
            myProfile={myProfile}
            onSendRequest={handleSendRequest}
            loading={loading}
            user={user}
          />
        )}
        
        {activeTab === 'partners' && (
          <MyPartnersTab
            key="partners"
            myPartners={myPartners}
            myProfile={myProfile}
            onEndPartnership={handleEndPartnership}
            loading={loading}
            user={user}
          />
        )}
        
        {activeTab === 'requests' && (
          <RequestsTab
            key="requests"
            pendingRequests={pendingRequests}
            sentRequests={sentRequests}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
            loading={loading}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <CreateGoalModal
          newGoal={newGoal}
          setNewGoal={setNewGoal}
          onSubmit={handleCreateGoal}
          onClose={() => setShowCreateGoal(false)}
          isEditing={!!myProfile}
        />
      )}
    </div>
  );
}

// Sub-components
function FindPartnersTab({ potentialPartners, myProfile, onSendRequest, loading, user }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="text-center py-16">
        <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Set your goal first</h3>
        <p className="text-muted-foreground mb-6">
          Create a public goal to find accountability partners with similar interests.
        </p>
        <button
          onClick={() => setShowCreateGoal(true)}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Set Your Goal
        </button>
      </div>
    );
  }

  if (potentialPartners.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No partners found</h3>
        <p className="text-muted-foreground">
          No one with similar goals is currently looking for partners. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {potentialPartners.map((partner) => (
        <PartnerCard
          key={partner.user_id}
          partner={partner}
          onSendRequest={onSendRequest}
          currentUserId={user.id}
        />
      ))}
    </div>
  );
}

function PartnerCard({ partner, onSendRequest, currentUserId }) {
  const hasRequested = false; // Would check sent requests
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-soft"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold">
            {partner.display_name?.charAt(0) || partner.username?.charAt(0) || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {partner.display_name || partner.username || 'Student'}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            @{partner.username}
          </p>
        </div>
      </div>
      
      <div className="mb-3 p-3 bg-muted/50 rounded-xl">
        <h4 className="font-medium text-foreground mb-1">{partner.current_goal}</h4>
        <p className="text-sm text-muted-foreground">{partner.goal_description}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            {partner.goal_category}
          </span>
          {partner.goal_target && (
            <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
              {partner.goal_target}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Flame className="w-4 h-4" />
          {partner.current_streak} day streak
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {partner.longest_streak} best
        </span>
      </div>
      
      <button
        onClick={() => onSendRequest(partner.user_id)}
        disabled={hasRequested || partner.user_id === currentUserId}
        className={cn(
          "w-full px-4 py-2 rounded-xl font-medium transition-colors",
          hasRequested || partner.user_id === currentUserId
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {hasRequested ? 'Requested' : partner.user_id === currentUserId ? 'Your Profile' : 'Send Request'}
      </button>
    </motion.div>
  );
}

function MyPartnersTab({ myPartners, myProfile, onEndPartnership, loading, user }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (myPartners.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No partners yet</h3>
        <p className="text-muted-foreground mb-6">
          Find someone with similar goals and send them a request to get started.
        </p>
        <button
          onClick={() => setActiveTab('find')}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Find Partners
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myPartners.map((partnership) => (
        <PartnershipCard
          key={partnership.id}
          partnership={partnership}
          myProfile={myProfile}
          onEndPartnership={onEndPartnership}
          currentUserId={user.id}
        />
      ))}
    </div>
  );
}

function PartnershipCard({ partnership, myProfile, onEndPartnership, currentUserId }) {
  // Would need to fetch partner's profile data
  const partnerId = partnership.user_id === currentUserId ? partnership.partner_id : partnership.user_id;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold">?</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Partner Name</h3>
          <p className="text-sm text-muted-foreground">Partner since {new Date(partnership.created_at).toLocaleDateString()}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              Mutual streak: {partnership.mutual_streak} days
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Best: {partnership.longest_mutual_streak} days
            </span>
          </div>
        </div>
        <button
          onClick={() => onEndPartnership(partnerId)}
          className="px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          End Partnership
        </button>
      </div>
    </motion.div>
  );
}

function RequestsTab({ pendingRequests, sentRequests, onAccept, onDecline, loading, user }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (pendingRequests.length === 0 && sentRequests.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No pending requests</h3>
        <p className="text-muted-foreground">
          Requests you send or receive will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Received Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                type="received"
                onAccept={onAccept}
                onDecline={onDecline}
              />
            ))}
          </div>
        </div>
      )}
      
      {sentRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Sent Requests ({sentRequests.length})
          </h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                type="sent"
                onAccept={onAccept}
                onDecline={onDecline}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, type, onAccept, onDecline }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="font-bold">?</span>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Student Name</h4>
            <p className="text-sm text-muted-foreground">
              {type === 'received' ? 'Wants to be your partner' : 'Request sent'}
            </p>
          </div>
        </div>
        {type === 'received' && (
          <div className="flex gap-2">
            <button
              onClick={() => onDecline(request.id)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Decline
            </button>
            <button
              onClick={() => onAccept(request.id)}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-500/90 transition-colors"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Accept
            </button>
          </div>
        )}
        {type === 'sent' && (
          <span className="px-3 py-1.5 text-sm text-orange-500 bg-orange-500/10 rounded-lg">
            <Clock className="w-4 h-4 inline mr-1" />
            Pending
          </span>
        )}
      </div>
    </motion.div>
  );
}

function CreateGoalModal({ newGoal, setNewGoal, onSubmit, onClose, isEditing }) {
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
            <h2 className="text-xl font-semibold text-foreground">
              {isEditing ? 'Edit Your Goal' : 'Set Your Goal'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Goal Category</label>
            <select
              value={newGoal.goal_category}
              onChange={(e) => setNewGoal(prev => ({ ...prev, goal_category: e.target.value }))}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {GOAL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Goal Title</label>
            <input
              type="text"
              value={newGoal.current_goal}
              onChange={(e) => setNewGoal(prev => ({ ...prev, current_goal: e.target.value }))}
              placeholder="e.g., Complete 30 Days of DSA"
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
            <textarea
              value={newGoal.goal_description}
              onChange={(e) => setNewGoal(prev => ({ ...prev, goal_description: e.target.value }))}
              placeholder="Describe your goal in detail..."
              rows={3}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Target (optional)</label>
            <input
              type="text"
              value={newGoal.goal_target}
              onChange={(e) => setNewGoal(prev => ({ ...prev, goal_target: e.target.value }))}
              placeholder="e.g., 2 hours daily, 100 problems, 30 min focus"
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <h4 className="font-medium text-foreground">Privacy Settings</h4>
            <PrivacyToggle
              label="Show goal publicly"
              value={newGoal.show_goal_publicly}
              onChange={(v) => setNewGoal(prev => ({ ...prev, show_goal_publicly: v }))}
            />
            <PrivacyToggle
              label="Share progress with partners"
              value={newGoal.show_progress_to_partners}
              onChange={(v) => setNewGoal(prev => ({ ...prev, show_progress_to_partners: v }))}
            />
            <PrivacyToggle
              label="Show streak to partners"
              value={newGoal.show_streak_to_partners}
              onChange={(v) => setNewGoal(prev => ({ ...prev, show_streak_to_partners: v }))}
            />
            <PrivacyToggle
              label="Allow partner requests"
              value={newGoal.allow_partner_requests}
              onChange={(v) => setNewGoal(prev => ({ ...prev, allow_partner_requests: v }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function PrivacyToggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          value ? "bg-primary" : "bg-muted"
        )}
        role="switch"
        aria-checked={value}
      >
        <span className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
          value ? "left-5.5" : "left-0.5"
        )} />
      </button>
    </label>
  );
}

export default AccountabilityPage;
