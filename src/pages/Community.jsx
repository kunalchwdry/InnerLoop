import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  HelpCircle, 
  Plus, 
  Bookmark,
  Bell,
  Menu,
  X,
  ChevronRight,
  Heart,
  Flag,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  UserPlus,
  Lock,
  Globe,
  Hash,
  Star,
  ArrowUp,
  ArrowDown,
  Loader2,
  Send,
  AtSign,
  Smile,
  Zap,
  Target,
  Trophy,
  BookOpen,
  GraduationCap,
  Settings,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import { CommunitySidebar } from '@/components/community/CommunitySidebar';
import AccountabilityPage from '@/components/community/AccountabilityPage';
import ChallengesPage from '@/components/community/ChallengesPage';
import ResourcesPage from '@/components/community/ResourcesPage';
import LeaderboardPage from '@/components/community/LeaderboardPage';
import MentorshipPage from '@/components/community/MentorshipPage';
import { AnimatePresence } from 'framer-motion';

const POST_TYPES = [
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-500 bg-blue-500/10' },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'text-purple-500 bg-purple-500/10' },
  { value: 'study_tip', label: 'Study Tip', icon: Zap, color: 'text-green-500 bg-green-500/10' },
  { value: 'resource', label: 'Resource', icon: Bookmark, color: 'text-orange-500 bg-orange-500/10' },
  { value: 'achievement', label: 'Achievement', icon: Star, color: 'text-yellow-500 bg-yellow-500/10' },
];

const COMMUNITY_CATEGORIES = [
  'DSA', 'Python', 'Artificial Intelligence', 'Machine Learning', 
  'Web Development', 'Cybersecurity', 'Mathematics', 'Engineering',
  'Competitive Programming', 'Hackathons', 'Data Science', 'DevOps',
  'Mobile Development', 'Cloud Computing', 'Blockchain', 'UI/UX Design'
];

const COMMUNITY_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can find and join' },
  { value: 'private', label: 'Private', description: 'Only invited members can join' }
];

function CommunityPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  const navigate = useNavigate();
  
const [activeTab, setActiveTab] = useState('home'); // home, communities, posts, messages, profile
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ 
    title: '', 
    content: '', 
    category: 'general', 
    image_url: null, 
    progress_data: null, 
    community_id: null,
    type: 'discussion',
    tags: [],
    visibility: 'public'
  });
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [helpQuestions, setHelpQuestions] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [showCommunityDetail, setShowCommunityDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Load user's community profile
      const profileData = await db.entities.CommunityProfile.filter({ user_id: user.id });
      if (profileData.length > 0) {
        setMyProfile(profileData[0]);
      }
      
      // Load communities
      const [communitiesData, myCommunitiesData] = await Promise.all([
        db.entities.Community.filter({ visibility: 'public', _sort: '-members_count', _limit: 20 }),
        db.entities.CommunityMember.filter({ user_id: user.id })
      ]);
      setCommunities(communitiesData || []);
      
      // Get my community details
      if (myCommunitiesData.length > 0) {
        const communityIds = myCommunitiesData.map(m => m.community_id);
        const myCommunitiesDetails = await Promise.all(
          communityIds.map(id => db.entities.Community.get(id))
        );
        setMyCommunities(myCommunitiesDetails.filter(Boolean));
      }
      
      // Load posts (public + community posts user is member of)
      const communityIds = myCommunitiesData.map(m => m.community_id);
      let postsQuery = { visibility: 'public', is_hidden: false, _sort: '-created_at', _limit: 20 };
      const publicPosts = await db.entities.Post.filter(postsQuery);
      
      // Also load community posts
      let communityPosts = [];
      if (communityIds.length > 0) {
        for (const cid of communityIds) {
          const cp = await db.entities.Post.filter({ 
            community_id: cid, 
            is_hidden: false, 
            _sort: '-created_at', 
            _limit: 10 
          });
          communityPosts.push(...cp);
        }
      }
      
      const allPosts = [...(publicPosts || []), ...communityPosts]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 30);
      setPosts(allPosts);
      
      // Trending posts (by likes + replies)
      const trending = [...allPosts]
        .sort((a, b) => (b.likes_count + b.replies_count) - (a.likes_count + a.replies_count))
        .slice(0, 5);
      setTrendingPosts(trending);
      
      // Help questions (unanswered questions)
      const questions = allPosts.filter(p => p.type === 'question' && p.replies_count < 3);
      setHelpQuestions(questions.slice(0, 5));
      
      // Active students (recently active profiles)
      const activeProfiles = await db.entities.CommunityProfile.filter({ 
        show_profile_to_public: true, 
        _sort: '-last_active_at', 
        _limit: 10 
      });
      setActiveStudents(activeProfiles.filter(p => p.user_id !== user.id));
      
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle post creation
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim() || !newPost.title.trim()) return;
    
    setCreatingPost(true);
    try {
      const postData = {
        title: newPost.title,
        content: newPost.content,
        category: newPost.category || 'general',
        image_url: newPost.image_url,
        progress_data: newPost.progress_data,
        community_id: newPost.community_id || null,
      };
      
      const created = await db.entities.Post.create(postData);
      
      // Update local state
      setPosts(prev => [created, ...prev]);
      setShowCreatePost(false);
      setNewPost({ 
        title: '', 
        content: '', 
        category: 'general', 
        image_url: null, 
        progress_data: null, 
        community_id: null,
        type: 'discussion',
        tags: [],
        visibility: 'public'
      });
      
      // Notify community members if posted in community
      if (created.community_id) {
        const members = await db.entities.CommunityMember.filter({ community_id: created.community_id });
        for (const member of members) {
          if (member.user_id !== user.id && member.notify_new_posts) {
            try {
              await createNotification({
                title: `New post in ${created.community_id}`,
                content: `${user.full_name || 'Someone'} posted: ${created.content.substring(0, 50)}...`,
                type: 'info',
                action_url: `/community/posts/${created.id}`,
              });
            } catch (e) {
              console.error('Failed to send notification:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
       setCreatingPost(false);
    }
  };

  // Handle like/reaction
  const handleReact = async (postId, reactionType = 'like') => {
    if (!isAuthenticated) return;
    
    try {
      // Check if already reacted
      const existing = await db.entities.PostReaction.filter({ 
        post_id: postId, 
        user_id: user.id,
        reaction_type: reactionType
      });
      
      if (existing.length > 0) {
        // Remove reaction
        await db.entities.PostReaction.delete(existing[0].id);
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
        ));
      } else {
        // Add reaction
        await db.entities.PostReaction.create({ 
          post_id: postId, 
          reaction_type: reactionType 
        });
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
        ));
        
        // Notify post author
        const post = posts.find(p => p.id === postId);
        if (post && post.created_by_id !== user.id) {
          await createNotification({
            title: 'New reaction on your post',
            content: `${user.full_name || 'Someone'} reacted to "${post.title}"`,
            type: 'info',
            action_url: `/community/posts/${postId}`,
          });
        }
      }
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  // Handle save/unsave post
  const handleSavePost = async (postId) => {
    if (!isAuthenticated) return;
    
    try {
      const existing = await db.entities.SavedPost.filter({ post_id: postId, user_id: user.id });
      
      if (existing.length > 0) {
        await db.entities.SavedPost.delete(existing[0].id);
      } else {
        await db.entities.SavedPost.create({ post_id: postId });
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  // Handle join/leave community
  const handleJoinCommunity = async (communityId) => {
    if (!isAuthenticated) return;
    
    try {
      const existing = await db.entities.CommunityMember.filter({ 
        community_id: communityId, 
        user_id: user.id 
      });
      
      if (existing.length > 0) {
        // Leave community
        await db.entities.CommunityMember.delete(existing[0].id);
        setMyCommunities(prev => prev.filter(c => c.id !== communityId));
        
        // Decrement member count
        const community = communities.find(c => c.id === communityId);
        if (community) {
          await db.entities.Community.update(communityId, { 
            members_count: Math.max(0, community.members_count - 1) 
          });
          setCommunities(prev => prev.map(c => 
            c.id === communityId ? { ...c, members_count: Math.max(0, c.members_count - 1) } : c
          ));
        }
      } else {
        // Join community
        const community = communities.find(c => c.id === communityId) || 
                         await db.entities.Community.get(communityId);
        
          if (community && (community.visibility === 'public' || !community.require_approval)) {
            await db.entities.CommunityMember.create({ 
              community_id: communityId,
              user_id: user.id,
              role: 'member' 
            });
          
          const updatedCommunity = await db.entities.Community.get(communityId);
          setMyCommunities(prev => [...prev, updatedCommunity]);
          
          // Increment member count
          await db.entities.Community.update(communityId, { 
            members_count: community.members_count + 1 
          });
          setCommunities(prev => prev.map(c => 
            c.id === communityId ? { ...c, members_count: c.members_count + 1 } : c
          ));
        }
      }
      loadData();
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  // Check if user is member of community
  const isMember = (communityId) => {
    return myCommunities.some(c => c.id === communityId);
  };

  // Check if post is saved
  const isPostSaved = (postId) => {
    // This would need a saved_posts query - simplified for now
    return false;
  };

  // Check if user reacted
  const hasReacted = (postId, reactionType = 'like') => {
    // Simplified - would need reaction query
    return false;
  };

  // Handle delete post
  const handleDeletePost = async (postId) => {
    if (!isAuthenticated) return;
    
    try {
      await db.entities.Post.delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      try {
        await createNotification({
          title: 'Post Deleted',
          content: 'Your post has been deleted successfully.',
          type: 'achievement',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      try {
        await createNotification({
          title: 'Error',
          content: 'Failed to delete post. Please try again.',
          type: 'warning',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
    }
  };

  // Handle delete community
  const handleDeleteCommunity = async (communityId) => {
    if (!isAuthenticated) return;
    
    try {
      await db.entities.Community.delete(communityId);
      setCommunities(prev => prev.filter(c => c.id !== communityId));
      setMyCommunities(prev => prev.filter(c => c.id !== communityId));
      try {
        await createNotification({
          title: 'Community Deleted',
          content: 'The community has been deleted successfully.',
          type: 'achievement',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      setShowCommunityDetail(false);
      setSelectedCommunity(null);
    } catch (error) {
      console.error('Error deleting community:', error);
      try {
        await createNotification({
          title: 'Error',
          content: 'Failed to delete community. Please try again.',
          type: 'warning',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
    }
  };

  // Format relative time
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

  // Get post type display
  const getPostTypeInfo = (type) => {
    return POST_TYPES.find(t => t.value === type) || POST_TYPES[1];
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
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Join the Community</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Connect with other students, ask questions, share knowledge, and grow together. 
            Sign in to access the InnerLoop Community.
          </p>
          <button
            onClick={() => navigate('/login?redirect=/community')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Sign In to Join
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile header with search */}
      <div className="lg:hidden sticky top-16 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics, questions, communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            aria-label="Create post"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted relative"
            aria-label="Messages"
          >
            <MessageSquare className="w-5 h-5" />
            {/* Unread badge would go here */}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        className="lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-card border-r border-border/60 flex flex-col"
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-5 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <CommunitySidebar 
          user={user}
          myCommunities={myCommunities}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setSidebarOpen(false)}
        />
      </motion.aside>

      <div className="lg:pl-[260px] min-h-screen pt-16 lg:pt-0">
        <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          {/* Desktop Search Bar */}
          <div className="hidden lg:flex lg:items-center lg:gap-4 lg:mb-8">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search topics, questions, communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>Create Post</span>
            </button>
          </div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <CommunityHome
                key="home"
                user={user}
                myProfile={myProfile}
                posts={posts}
                trendingPosts={trendingPosts}
                helpQuestions={helpQuestions}
                communities={communities}
                myCommunities={myCommunities}
                activeStudents={activeStudents}
                loading={loading}
                onReact={handleReact}
                onSavePost={handleSavePost}
                onDeletePost={handleDeletePost}
                onJoinCommunity={handleJoinCommunity}
                isMember={isMember}
                formatTime={formatTime}
                getPostTypeInfo={getPostTypeInfo}
                setShowCreatePost={setShowCreatePost}
                setSelectedCommunity={setSelectedCommunity}
                setShowCommunityDetail={setShowCommunityDetail}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'communities' && (
              <CommunitiesList
                key="communities"
                user={user}
                communities={communities}
                myCommunities={myCommunities}
                loading={loading}
                onJoinCommunity={handleJoinCommunity}
                isMember={isMember}
                setShowCommunityDetail={setShowCommunityDetail}
                setSelectedCommunity={setSelectedCommunity}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'posts' && (
              <PostsFeed
                key="posts"
                user={user}
                posts={posts}
                loading={loading}
                onReact={handleReact}
                onSavePost={handleSavePost}
                formatTime={formatTime}
                getPostTypeInfo={getPostTypeInfo}
                setShowCreatePost={setShowCreatePost}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'messages' && (
              <MessagesPage
                key="messages"
                user={user}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'profile' && (
              <CommunityProfilePage
                key="profile"
                user={user}
                myProfile={myProfile}
                setMyProfile={setMyProfile}
                posts={posts}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'help' && (
              <HelpSomeonePage
                key="help"
                user={user}
                helpQuestions={helpQuestions}
                myProfile={myProfile}
                onReact={handleReact}
                formatTime={formatTime}
                getPostTypeInfo={getPostTypeInfo}
                setActiveTab={setActiveTab}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal
          user={user}
          myCommunities={myCommunities}
          newPost={newPost}
          setNewPost={setNewPost}
          onSubmit={handleCreatePost}
          onClose={() => setShowCreatePost(false)}
          creating={creatingPost}
        />
      )}

      {/* Community Detail Modal */}
      {showCommunityDetail && selectedCommunity && (
        <CommunityDetailModal
          community={selectedCommunity}
          user={user}
          isMember={isMember(selectedCommunity.id)}
          onJoin={handleJoinCommunity}
          onDeleteCommunity={handleDeleteCommunity}
          onClose={() => { setShowCommunityDetail(false); setSelectedCommunity(null); }}
        />
      )}
    </div>
  );
}

function CommunityHome({ 
  user, myProfile, posts, trendingPosts, helpQuestions, 
  communities, myCommunities, activeStudents, loading,
  onReact, onSavePost, onDeletePost, onJoinCommunity, isMember,
  formatTime, getPostTypeInfo,
  setShowCreatePost, setSelectedCommunity, setShowCommunityDetail,
  setActiveTab
}) {
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-muted/50 rounded-xl animate-pulse max-w-xs" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 p-6 sm:p-8 border border-border/60"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect, learn, and grow with fellow students
            </p>
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-soft self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </button>
        </div>
      </motion.div>

      {/* Trending Discussions */}
      {trendingPosts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending Discussions
            </h2>
          </div>
          <div className="space-y-3">
            {trendingPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                formatTime={formatTime}
                getPostTypeInfo={getPostTypeInfo}
                onReact={onReact}
                onSavePost={onSavePost}
                onDeletePost={onDeletePost}
                compact={true}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Questions You Can Help With */}
      {helpQuestions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              Questions You Can Help With
            </h2>
            <button
              onClick={() => setActiveTab('help')}
              className="text-sm text-primary hover:underline font-medium"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {helpQuestions.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                formatTime={formatTime}
                getPostTypeInfo={getPostTypeInfo}
                onReact={onReact}
                onSavePost={onSavePost}
                compact={true}
                highlightHelp={true}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Study Communities */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            Study Communities
          </h2>
          <button
            onClick={() => setActiveTab('communities')}
            className="text-sm text-primary hover:underline font-medium"
          >
            Browse all →
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.slice(0, 6).map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isMember={isMember(community.id)}
              onJoin={onJoinCommunity}
              onClick={() => { setSelectedCommunity(community); setShowCommunityDetail(true); }}
            />
          ))}
        </div>
      </motion.section>

      {/* Active Students */}
      {activeStudents.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            Active Students
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {activeStudents.slice(0, 8).map((student) => (
              <StudentCard key={student.user_id} student={student} />
            ))}
          </div>
        </motion.section>
      )}

      {/* My Communities */}
      {myCommunities.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              My Communities
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                isMember={true}
                onJoin={onJoinCommunity}
                onClick={() => { setSelectedCommunity(community); setShowCommunityDetail(true); }}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Recent Posts */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recent Posts
          </h2>
          <button
            onClick={() => setActiveTab('posts')}
            className="text-sm text-primary hover:underline font-medium"
          >
            View all →
          </button>
        </div>
        <div className="space-y-4">
          {posts.slice(0, 10).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              formatTime={formatTime}
              getPostTypeInfo={getPostTypeInfo}
              onReact={onReact}
              onSavePost={onSavePost}
            />
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function PostCard({ post, user, formatTime, getPostTypeInfo, onReact, onSavePost, onDeletePost, compact = false, highlightHelp = false }) {
  const typeInfo = getPostTypeInfo(post.type);
  const TypeIcon = typeInfo.icon;
  const isSaved = false; // Would check saved_posts
  const hasLiked = false; // Would check post_reactions
  const isOwnPost = post.created_by_id === user.id;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card p-4 sm:p-5 transition-all hover:border-border hover:shadow-soft",
        highlightHelp && "ring-1 ring-orange-500/30"
      )}
    >
      {highlightHelp && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500/10 text-orange-500 text-xs font-medium rounded-full">
          Help needed
        </div>
      )}
      
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", typeInfo.color)}>
            <TypeIcon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium text-foreground truncate">
                {post.created_by_id === user.id ? 'You' : 'Anonymous'} {/* Would join with profile */}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(post.created_at)}
              </span>
              {post.community_id && (
                <span className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full truncate max-w-[100px]">
                  #{post.community_id.slice(0, 8)}
                </span>
              )}
            </div>
            {isOwnPost && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                  aria-label="Post options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMenu(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 z-20 w-40 bg-card rounded-xl border border-border/60 shadow-lg py-1"
                    >
                      <button
                        onClick={() => {
                          onDeletePost(post.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>
              {post.title}
            </h3>
            
            {!compact && (
              <p className="text-muted-foreground line-clamp-3">
                {post.content}
              </p>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats & Actions */}
            <div className="flex items-center gap-4 pt-2 border-t border-border/60">
              <button
                onClick={() => onReact(post.id, 'like')}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors",
                  hasLiked ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
                <span>{post.likes_count}</span>
              </button>
              
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{post.replies_count}</span>
              </button>
              
              <button
                onClick={() => onSavePost(post.id)}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors ml-auto",
                  isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CommunityCard({ community, isMember, onJoin, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 transition-all cursor-pointer",
        "hover:border-border hover:shadow-soft hover:bg-muted/30"
      )}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-medium flex-shrink-0", community.color || "bg-primary/10 text-primary")}>
          {community.icon || community.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{community.name}</h3>
          <p className="text-sm text-muted-foreground truncate mt-1">{community.description}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{community.members_count.toLocaleString()} members</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(community.id); }}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            isMember
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isMember ? 'Joined' : 'Join'}
        </button>
      </div>
    </motion.div>
  );
}

function StudentCard({ student }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-shrink-0 w-40 text-center"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-2 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">
            {student.display_name?.charAt(0) || student.username?.charAt(0) || '?'}
          </span>
        </div>
        {student.last_active_at && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>
      <p className="font-medium text-sm text-foreground truncate">
        {student.display_name || student.username || 'Student'}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {student.subjects?.[0] || 'General'}
      </p>
    </motion.div>
  );
}

function CommunitiesList({ user, communities, myCommunities, loading, onJoinCommunity, isMember, setShowCommunityDetail, setSelectedCommunity, setActiveTab }) {
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    category: 'general',
    visibility: 'public',
    icon: '',
    color: 'bg-primary/10 text-primary'
  });
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!newCommunity.name.trim() || !newCommunity.description.trim()) return;
    
    setCreatingCommunity(true);
    try {
      const communityData = {
        name: newCommunity.name,
        description: newCommunity.description,
        visibility: newCommunity.visibility,
        icon: newCommunity.icon || newCommunity.name.charAt(0).toUpperCase(),
        color: newCommunity.color,
      };
      
      const created = await db.entities.Community.create(communityData);
      
      // Auto-join as owner
      await db.entities.CommunityMember.create({
        community_id: created.id,
        user_id: user.id,
        role: 'owner'
      });
      
      // Update local state
      const updatedCommunity = await db.entities.Community.get(created.id);
      setCommunities(prev => [updatedCommunity, ...prev]);
      setMyCommunities(prev => [...prev, updatedCommunity]);
      setShowCreateCommunity(false);
      setNewCommunity({
        name: '',
        description: '',
        category: 'general',
        visibility: 'public',
        icon: '',
        color: 'bg-primary/10 text-primary'
      });
    } catch (error) {
      console.error('Error creating community:', error);
    } finally {
      setCreatingCommunity(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Communities</h1>
        <button
          onClick={() => setShowCreateCommunity(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Community
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isMember={isMember(community.id)}
              onJoin={onJoinCommunity}
              onClick={() => { setSelectedCommunity(community); setShowCommunityDetail(true); }}
            />
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateCommunity && (
        <CreateCommunityModal
          user={user}
          newCommunity={newCommunity}
          setNewCommunity={setNewCommunity}
          onSubmit={handleCreateCommunity}
          onClose={() => setShowCreateCommunity(false)}
          creating={creatingCommunity}
        />
      )}
    </div>
  );
}

function PostsFeed({ user, posts, loading, onReact, onSavePost, formatTime, getPostTypeInfo, setShowCreatePost, setActiveTab }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">All Posts</h1>
        <button
          onClick={() => setShowCreatePost(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-6">Be the first to start a discussion!</p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              formatTime={formatTime}
              getPostTypeInfo={getPostTypeInfo}
              onReact={onReact}
              onSavePost={onSavePost}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessagesPage({ user, setActiveTab }) {
  const [activeSection, setActiveSection] = useState('chats'); // chats, friends, requests
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    loadSentRequests();
  }, []);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await db.friendship.getFriends();
      setFriends(data || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await db.friendship.getPendingFriendRequests();
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadSentRequests = async () => {
    try {
      const data = await db.friendship.getSentFriendRequests();
      setSentRequests(data || []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  };

  const handleSearchUser = async () => {
    if (!searchUsername.trim() || searchUsername.startsWith('@')) return;
    setSearching(true);
    try {
      const results = await db.friendship.searchUserByUsername(searchUsername);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (username) => {
    try {
      await db.friendship.sendFriendRequest(username);
      setSearchUsername('');
      setSearchResults([]);
      setShowAddFriend(false);
      loadSentRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await db.friendship.acceptFriendRequest(requestId);
      loadPendingRequests();
      loadFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert(error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await db.friendship.rejectFriendRequest(requestId);
      loadPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert(error.message || 'Failed to reject request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await db.friendship.cancelFriendRequest(requestId);
      loadSentRequests();
    } catch (error) {
      console.error('Error canceling request:', error);
      alert(error.message || 'Failed to cancel request');
    }
  };

  const handleUnfriend = async (friendId) => {
    if (!confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await db.friendship.unfriend(friendId);
      loadFriends();
    } catch (error) {
      console.error('Error unfriending:', error);
      alert(error.message || 'Failed to unfriend');
    }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <button
          onClick={() => setShowAddFriend(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-border/60">
        {[{
          id: 'chats', label: 'Chats', count: friends.length
        }, {
          id: 'friends', label: 'Friends', count: friends.length
        }, {
          id: 'requests', label: 'Requests', count: pendingRequests.length + sentRequests.length
        }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-xl transition-colors border-b-2 -mb-px",
              activeSection === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <AddFriendModal
          onClose={() => { setShowAddFriend(false); setSearchUsername(''); setSearchResults([]); }}
          onSearch={handleSearchUser}
          onSendRequest={handleSendFriendRequest}
          searchUsername={searchUsername}
          setSearchUsername={setSearchUsername}
          searchResults={searchResults}
          searching={searching}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {activeSection === 'chats' && (
          <ChatList friends={friends} loading={loadingFriends} />
        )}

        {activeSection === 'friends' && (
          <FriendsList friends={friends} loading={loadingFriends} onUnfriend={handleUnfriend} />
        )}

        {activeSection === 'requests' && (
          <FriendRequestsList
            pendingRequests={pendingRequests}
            sentRequests={sentRequests}
            loading={loadingRequests}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onCancel={handleCancelRequest}
          />
        )}
      </div>
    </div>
  );
}

function CommunityProfilePage({ user, myProfile, setMyProfile, posts }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    subjects: [],
    interests: [],
    skills: [],
    learning_goals: [],
    show_profile_to_public: true,
    show_subjects: true,
    show_interests: true,
    show_skills: true,
    show_learning_goals: true,
    allow_direct_messages: true,
  });

  useEffect(() => {
    if (myProfile) {
      setFormData(prev => ({ ...prev, ...myProfile }));
    }
  }, [myProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        subjects: formData.subjects.filter(s => s.trim()),
        interests: formData.interests.filter(s => s.trim()),
        skills: formData.skills.filter(s => s.trim()),
        learning_goals: formData.learning_goals.filter(s => s.trim()),
      };
      
      if (myProfile) {
        await db.entities.CommunityProfile.update(myProfile.id, data);
      } else {
        await db.entities.CommunityProfile.create(data);
      }
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleTagAdd = (field, value) => {
    const tag = value.trim();
    if (tag && !formData[field].includes(tag)) {
      setFormData(prev => ({ ...prev, [field]: [...prev[field], tag] }));
    }
  };

  const handleTagRemove = (field, tag) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }));
  };

  const handleKeyDown = (field, e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      handleTagAdd(field, e.target.value);
      e.target.value = '';
    }
  };

  const myPosts = posts.filter(p => p.created_by_id === user.id);

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* Profile Header */}
        <div className="relative h-40 bg-gradient-to-br from-primary/10 to-secondary/10" />
        <div className="px-6 pb-6 -mt-16 relative">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-card border border-border/60 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-primary">
                {myProfile?.display_name?.charAt(0) || user?.full_name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {myProfile?.display_name || user?.full_name || 'Your Profile'}
              </h1>
              {myProfile?.username && (
                <p className="text-muted-foreground">@{myProfile.username}</p>
              )}
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors ml-auto"
            >
              {editing ? 'Save' : 'Edit'}
            </button>
          </div>

          {myProfile?.bio && !editing && (
            <p className="text-muted-foreground mb-4">{myProfile.bio}</p>
          )}

          {/* Tags Display */}
          {!editing && (
            <div className="space-y-3">
              {myProfile?.subjects?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.subjects.map(s => (
                      <span key={s} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {myProfile?.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.skills.map(s => (
                      <span key={s} className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {myProfile?.interests?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.interests.map(s => (
                      <span key={s} className="px-2 py-1 text-xs bg-purple-500/10 text-purple-500 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {myProfile?.learning_goals?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Learning Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.learning_goals.map(s => (
                      <span key={s} className="px-2 py-1 text-xs bg-orange-500/10 text-orange-500 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Form */}
          {editing && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Tag inputs */}
              <TagInput 
                label="Subjects" 
                value={formData.subjects} 
                onAdd={handleTagAdd} 
                onRemove={handleTagRemove}
                onKeyDown={(e) => handleKeyDown('subjects', e)}
                suggestions={COMMUNITY_CATEGORIES}
              />
              <TagInput 
                label="Skills" 
                value={formData.skills} 
                onAdd={handleTagAdd} 
                onRemove={handleTagRemove}
                onKeyDown={(e) => handleKeyDown('skills', e)}
                suggestions={COMMUNITY_CATEGORIES}
              />
              <TagInput 
                label="Interests" 
                value={formData.interests} 
                onAdd={handleTagAdd} 
                onRemove={handleTagRemove}
                onKeyDown={(e) => handleKeyDown('interests', e)}
                suggestions={COMMUNITY_CATEGORIES}
              />
              <TagInput 
                label="Learning Goals" 
                value={formData.learning_goals} 
                onAdd={handleTagAdd} 
                onRemove={handleTagRemove}
                onKeyDown={(e) => handleKeyDown('learning_goals', e)}
                suggestions={COMMUNITY_CATEGORIES}
              />

              {/* Privacy toggles */}
              <div className="border-t border-border/60 pt-4 space-y-3">
                <h4 className="font-medium text-foreground">Privacy Settings</h4>
                <PrivacyToggle 
                  label="Show profile publicly" 
                  value={formData.show_profile_to_public} 
                  onChange={(v) => setFormData(prev => ({ ...prev, show_profile_to_public: v }))}
                />
                <PrivacyToggle 
                  label="Show subjects" 
                  value={formData.show_subjects} 
                  onChange={(v) => setFormData(prev => ({ ...prev, show_subjects: v }))}
                />
                <PrivacyToggle 
                  label="Show skills" 
                  value={formData.show_skills} 
                  onChange={(v) => setFormData(prev => ({ ...prev, show_skills: v }))}
                />
                <PrivacyToggle 
                  label="Show interests" 
                  value={formData.show_interests} 
                  onChange={(v) => setFormData(prev => ({ ...prev, show_interests: v }))}
                />
                <PrivacyToggle 
                  label="Show learning goals" 
                  value={formData.show_learning_goals} 
                  onChange={(v) => setFormData(prev => ({ ...prev, show_learning_goals: v }))}
                />
                <PrivacyToggle 
                  label="Allow direct messages" 
                  value={formData.allow_direct_messages} 
                  onChange={(v) => setFormData(prev => ({ ...prev, allow_direct_messages: v }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* My Posts */}
        <div className="border-t border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">My Posts</h3>
          {myPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No posts yet</p>
          ) : (
            <div className="space-y-3">
              {myPosts.slice(0, 10).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  formatTime={formatTime}
                  getPostTypeInfo={getPostTypeInfo}
                  onReact={() => {}}
                  onSavePost={() => {}}
                  compact={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagInput({ label, value, onAdd, onRemove, onKeyDown, suggestions }) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <div className="relative">
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[38px]">
          {value.map(tag => (
            <span key={tag} className="px-2 py-1 text-xs bg-muted/50 text-foreground rounded-full flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(label, tag)}
                className="text-muted-foreground hover:text-rose-500 w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onKeyDown(e);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={`Add ${label.toLowerCase()}...`}
            className="flex-1 min-w-[120px] px-3 py-1.5 bg-muted/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border/60 rounded-xl shadow-lg max-h-40 overflow-auto">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onAdd(label, s); setInputValue(''); setShowSuggestions(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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

function HelpSomeonePage({ user, helpQuestions, myProfile, onReact, formatTime, getPostTypeInfo }) {
  const mySkills = myProfile?.skills || [];
  const mySubjects = myProfile?.subjects || [];
  const myInterests = myProfile?.interests || [];
  const allMyTopics = [...new Set([...mySkills, ...mySubjects, ...myInterests])];

  // Filter questions that match user's skills
  const relevantQuestions = helpQuestions.filter(q => 
    q.tags?.some(tag => allMyTopics.includes(tag)) || 
    allMyTopics.length === 0
  );

  return (
    <div className="animate-fade-in max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-orange-500/10 via-transparent to-yellow-500/10 p-6 sm:p-8 border border-border/60 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help Someone Learn</h1>
            <p className="text-muted-foreground mt-1">
              Share your knowledge and help fellow students who are stuck on topics you know well.
            </p>
          </div>
        </div>
        
        {allMyTopics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground mb-2">You can help with:</p>
            <div className="flex flex-wrap gap-2">
              {allMyTopics.slice(0, 8).map(topic => (
                <span key={topic} className="px-2 py-1 text-xs bg-orange-500/10 text-orange-500 rounded-full">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <div className="space-y-4">
        {relevantQuestions.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No questions to help with right now</h3>
            <p className="text-muted-foreground">
              {allMyTopics.length === 0 
                ? 'Add your skills and interests to your profile to see relevant questions.'
                : 'Check back later for new questions in your areas of expertise.'
              }
            </p>
          </div>
        ) : (
          relevantQuestions.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              formatTime={formatTime}
              getPostTypeInfo={getPostTypeInfo}
              onReact={onReact}
              onSavePost={() => {}}
              highlightHelp={true}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CreateCommunityModal({ user, newCommunity, setNewCommunity, onSubmit, onClose, creating }) {
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
            <h2 className="text-xl font-semibold text-foreground">Create Community</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Community Name</label>
            <input
              type="text"
              value={newCommunity.name}
              onChange={(e) => setNewCommunity(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., DSA Study Group"
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={newCommunity.description}
              onChange={(e) => setNewCommunity(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your community..."
              rows={3}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              required
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Visibility</label>
            <select
              value={newCommunity.visibility}
              onChange={(e) => setNewCommunity(prev => ({ ...prev, visibility: e.target.value }))}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="public">Public - Anyone can find and join</option>
              <option value="private">Private - Only invited members can join</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Color Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {[ 
                'bg-primary/10 text-primary',
                'bg-blue-500/10 text-blue-500',
                'bg-green-500/10 text-green-500',
                'bg-purple-500/10 text-purple-500',
                'bg-orange-500/10 text-orange-500'
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCommunity(prev => ({ ...prev, color }))}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-medium transition-all",
                    color,
                    newCommunity.color === color && "ring-2 ring-primary"
                  )}
                >
                  {newCommunity.icon || 'A'}
                </button>
              ))}
            </div>
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
              disabled={creating || !newCommunity.name.trim() || !newCommunity.description.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Community'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function CreatePostModal({ user, myCommunities, newPost, setNewPost, onSubmit, onClose, creating }) {
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
            <h2 className="text-xl font-semibold text-foreground">Create Post</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Post Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Post Type</label>
            <div className="grid grid-cols-5 gap-2">
              {POST_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = newPost.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewPost(prev => ({ ...prev, type: type.value }))}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border/60 hover:border-primary/50 text-muted-foreground"
                    )}
                  >
                    <TypeIcon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What's your question or topic?"
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Content</label>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Share your question, thoughts, or resource..."
              rows={5}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags (optional)</label>
            <TagInput
              label=""
              value={newPost.tags}
              onAdd={(_, tag) => setNewPost(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
              onRemove={(_, tag) => setNewPost(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  setNewPost(prev => ({ ...prev, tags: [...prev.tags, e.target.value.trim()] }));
                  e.target.value = '';
                }
              }}
              suggestions={COMMUNITY_CATEGORIES}
            />
          </div>

          {/* Community */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Post in Community (optional)</label>
            <select
              value={newPost.community_id || ''}
              onChange={(e) => setNewPost(prev => ({ ...prev, community_id: e.target.value || null }))}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Public (everyone can see)</option>
              {myCommunities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Visibility</label>
            <select
              value={newPost.visibility}
              onChange={(e) => setNewPost(prev => ({ ...prev, visibility: e.target.value }))}
              className="w-full px-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="public">Public</option>
              <option value="community">Community Only</option>
            </select>
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
              disabled={creating || !newPost.title.trim() || !newPost.content.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </span>
              ) : (
                'Create Post'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function AddFriendModal({ onClose, onSearch, onSendRequest, searchUsername, setSearchUsername, searchResults, searching }) {
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
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Add Friend</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Enter username (with @)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
                placeholder="Enter @username"
                className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            onClick={onSearch}
            disabled={!searchUsername.trim() || searchUsername.startsWith('@') || searching}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <div key={result.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {result.display_name?.charAt(0) || result.username?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{result.display_name || result.username}</p>
                    <p className="text-sm text-muted-foreground truncate">@{result.username}</p>
                    {result.bio && <p className="text-xs text-muted-foreground truncate mt-1">{result.bio}</p>}
                  </div>
                  {!result.is_friend && !result.has_pending_request && (
                    <button
                      onClick={() => onSendRequest(result.username)}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {result.request_status === 'sent' ? 'Request Sent' : 'Send Request'}
                    </button>
                  )}
                  {result.has_pending_request && (
                    <span className="px-3 py-1.5 text-sm bg-orange-500/10 text-orange-500 rounded-lg">
                      {result.request_status === 'received' ? 'Pending' : 'Request Sent'}
                    </span>
                  )}
                  {result.is_friend && (
                    <span className="px-3 py-1.5 text-sm bg-green-500/10 text-green-500 rounded-lg">Friends</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChatList({ friends, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No friends yet</h3>
        <p className="text-muted-foreground mb-6">Add friends to start chatting!</p>
        <button
          onClick={() => setShowAddFriend(true)}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto p-4">
      {friends.map((friend) => (
        <button
          key={friend.friend_id}
          className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60 hover:bg-muted/50 transition-colors"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {friend.display_name?.charAt(0) || friend.username?.charAt(0) || '?'}
              </span>
            </div>
            {friend.unread_count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {friend.unread_count > 9 ? '9+' : friend.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {friend.display_name || friend.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {friend.username ? `@${friend.username}` : 'No username'}
            </p>
          </div>
          {friend.last_message_at && (
            <span className="text-xs text-muted-foreground">
              {formatTime(friend.last_message_at)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function FriendsList({ friends, loading, onUnfriend }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No friends yet</h3>
        <p className="text-muted-foreground mb-6">Add friends to see them here!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {friends.map((friend) => (
        <div
          key={friend.friend_id}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60 hover:bg-muted/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {friend.display_name?.charAt(0) || friend.username?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {friend.display_name || friend.username || 'Friend'}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {friend.username ? `@${friend.username}` : 'No username'}
            </p>
          </div>
          <button
            onClick={() => onUnfriend(friend.friend_id)}
            className="px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            Unfriend
          </button>
        </div>
      ))}
    </div>
  );
}

function FriendRequestsList({ pendingRequests, sentRequests, loading, onAccept, onReject, onCancel }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Received Requests</h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {request.sender_display_name?.charAt(0) || request.sender_username?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.sender_display_name || request.sender_username}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{request.sender_username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAccept(request.id)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-500/90 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    className="flex-1 px-3 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-500/90 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Sent Requests</h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {request.receiver_display_name?.charAt(0) || request.receiver_username?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.receiver_display_name || request.receiver_username}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{request.receiver_username}
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full",
                  request.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                  request.status === 'accepted' ? "bg-green-500/10 text-green-500" :
                  "bg-rose-500/10 text-rose-500"
                )}>
                  {request.status}
                </span>
                {request.status === 'pending' && (
                  <button
                    onClick={() => onCancel(request.id)}
                    className="px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityDetailModal({ community, user, isMember, onJoin, onDeleteCommunity, onClose }) {
  const isOwner = community.created_by_id === user.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border/60 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{community.name}</h2>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-medium mx-auto", community.color || "bg-primary/10 text-primary")}>
            {community.icon || community.name.charAt(0)}
          </div>

          <p className="text-muted-foreground text-center">{community.description}</p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {community.members_count.toLocaleString()} members
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {community.posts_count} posts
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {community.tags?.slice(0, 5).map(tag => (
              <span key={tag} className="px-2 py-1 text-xs bg-muted/50 text-muted-foreground rounded-full">
                #{tag}
              </span>
            ))}
          </div>

          <button
            onClick={() => onJoin(community.id)}
            className={cn(
              "w-full px-4 py-3 rounded-xl font-medium transition-colors",
              isMember
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isMember ? 'Leave Community' : 'Join Community'}
          </button>

          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-3 rounded-xl font-medium transition-colors bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
            >
              Delete Community
            </button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {community.visibility === 'public' ? 'Public community' : 'Private community'}
          </p>

          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border/60 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Delete Community</h3>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
                    <h4 className="font-semibold text-foreground mb-2">Delete "{community.name}"?</h4>
                    <p className="text-muted-foreground text-sm">
                      This will permanently remove the community and all its associated content including posts, members, and challenges. This action cannot be undone.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDeleteCommunity(community.id);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-500/90 transition-colors"
                    >
                      Delete Community
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Home icon
function Home({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

// User icon (reusing from lucide-react)
function User({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default CommunityPage;