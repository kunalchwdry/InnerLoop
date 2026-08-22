import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import {
  BookOpen,
  FileText,
  Map,
  GraduationCap,
  Video,
  Code,
  Lightbulb,
  Wrench,
  Users,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Heart,
  Bookmark,
  Flag,
  Share2,
  MoreHorizontal,
  Loader2,
  Plus,
  ExternalLink,
  Eye as EyeIcon,
  Star,
  Zap,
  X,
  List,
  Grid
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'all', label: 'All', icon: BookOpen },
  { value: 'note', label: 'Notes', icon: FileText },
  { value: 'roadmap', label: 'Roadmaps', icon: Map },
  { value: 'course', label: 'Courses', icon: GraduationCap },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'article', label: 'Articles', icon: FileText },
  { value: 'practice_resource', label: 'Practice', icon: Code },
  { value: 'project_idea', label: 'Projects', icon: Lightbulb },
  { value: 'study_material', label: 'Materials', icon: BookOpen },
  { value: 'tool', label: 'Tools', icon: Wrench },
  { value: 'community', label: 'Communities', icon: Users },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', icon: ArrowDown },
  { value: 'popular', label: 'Most Upvoted', icon: ArrowUp },
  { value: 'most_viewed', label: 'Most Viewed', icon: EyeIcon },
  { value: 'recent', label: 'Recently Updated', icon: Zap },
];

function ResourcesPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [activeSort, setActiveSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Load categories
      const categoriesData = await db.entities.ResourceCategory.filter({ 
        is_active: true, 
        _sort: 'sort_order' 
      });
      setCategories(categoriesData || []);
      
      // Load resources
      let resourcesQuery = { 
        is_hidden: false, 
        visibility: 'public', 
        _sort: '-created_at', 
        _limit: 50 
      };
      
      if (activeType !== 'all') {
        resourcesQuery.type = activeType;
      }
      
      const resourcesData = await db.entities.Resource.filter(resourcesQuery);
      setResources(resourcesData || []);
      
      // Load user's resources
      const myResourcesData = await db.entities.Resource.filter({ 
        created_by_id: user.id,
        _sort: '-created_at' 
      });
      setMyResources(myResourcesData || []);
      
      // Load saved resources
      const savedData = await db.entities.SavedResource.filter({ user_id: user.id });
      const savedResourceDetails = await Promise.all(
        savedData.map(async (s) => {
          const resource = await db.entities.Resource.get(s.resource_id);
          return { ...s, resource };
        })
      );
      setSavedResources(savedResourceDetails.filter(Boolean));
      
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, activeType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredResources = resources.filter(r => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(query) ||
             r.description?.toLowerCase().includes(query) ||
             r.tags?.some(t => t.toLowerCase().includes(query));
    }
    return true;
  }).sort((a, b) => {
    switch (activeSort) {
      case 'popular': return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      case 'most_viewed': return (b.views_count || 0) - (a.views_count || 0);
      case 'recent': return new Date(b.updated_at) - new Date(a.updated_at);
      default: return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  const handleUpvote = async (resourceId) => {
    try {
      const existing = await db.entities.ResourceVote.filter({ 
        resource_id: resourceId, 
        user_id: user.id 
      });
      
      if (existing.length > 0) {
        if (existing[0].vote_type === 'upvote') {
          await db.entities.ResourceVote.delete(existing[0].id);
          setResources(prev => prev.map(r => 
            r.id === resourceId ? { ...r, upvotes_count: Math.max(0, (r.upvotes_count || 0) - 1) } : r
          ));
        } else {
          await db.entities.ResourceVote.update(existing[0].id, { vote_type: 'upvote' });
          setResources(prev => prev.map(r => 
            r.id === resourceId ? { 
              ...r, 
              upvotes_count: (r.upvotes_count || 0) + 1,
              downvotes_count: Math.max(0, (r.downvotes_count || 0) - 1)
            } : r
          ));
        }
      } else {
        await db.entities.ResourceVote.create({ 
          resource_id: resourceId, 
          user_id: user.id, 
          vote_type: 'upvote' 
        });
        setResources(prev => prev.map(r => 
          r.id === resourceId ? { ...r, upvotes_count: (r.upvotes_count || 0) + 1 } : r
        ));
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleSave = async (resourceId) => {
    try {
      const existing = await db.entities.SavedResource.filter({ 
        resource_id: resourceId, 
        user_id: user.id 
      });
      
      if (existing.length > 0) {
        await db.entities.SavedResource.delete(existing[0].id);
        setSavedResources(prev => prev.filter(s => s.resource_id !== resourceId));
      } else {
        await db.entities.SavedResource.create({ resource_id: resourceId });
        const resource = await db.entities.Resource.get(resourceId);
        if (resource) setSavedResources(prev => [...prev, { resource, created_at: new Date().toISOString() }]);
      }
    } catch (error) {
      console.error('Error saving resource:', error);
    }
  };

  const handleReport = async (resourceId) => {
    // Report functionality
    try {
      await db.entities.Report.create({
        reported_content_type: 'resource',
        reported_content_id: resourceId,
        reason: 'inappropriate_content',
        description: 'User reported this resource',
      });
      await createNotification({
        title: 'Report Submitted',
        content: 'Thank you for reporting. Our moderation team will review this.',
        type: 'info',
      });
    } catch (error) {
      console.error('Error reporting:', error);
    }
  };

  const isSaved = (resourceId) => {
    return savedResources.some(s => s.resource_id === resourceId);
  };

  const hasUpvoted = (resourceId) => {
    // Would check votes - simplified
    return false;
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
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Explore Resources</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Discover notes, roadmaps, courses, and more shared by the community.
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
              Community Resources
            </h1>
            <p className="text-muted-foreground mt-1">
              Notes, roadmaps, courses, and study materials shared by students
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-soft self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Share Resource</span>
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search resources, tags, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value)}
            className="px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            aria-label={viewMode === 'grid' ? 'List view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setActiveType(type.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors whitespace-nowrap",
              activeType === type.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Resources Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-4'}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={viewMode === 'grid' ? 'h-64 bg-muted/50 rounded-xl animate-pulse' : 'h-24 bg-muted/50 rounded-xl animate-pulse'} />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-4'}>
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isSaved={isSaved(resource.id)}
              hasUpvoted={hasUpvoted(resource.id)}
              onUpvote={handleUpvote}
              onSave={handleSave}
              onReport={handleReport}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Create Resource Modal */}
      {showCreateModal && (
        <CreateResourceModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          isSaved={isSaved(selectedResource.id)}
          onSave={handleSave}
          onUpvote={handleUpvote}
          onReport={handleReport}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

function ResourceCard({ resource, isSaved, hasUpvoted, onUpvote, onSave, onReport, viewMode }) {
  const typeIcons = {
    note: FileText,
    roadmap: Map,
    course: GraduationCap,
    video: Video,
    article: FileText,
    practice_resource: Code,
    project_idea: Lightbulb,
    study_material: BookOpen,
    tool: Wrench,
    community: Users,
  };
  const TypeIcon = typeIcons[resource.type] || BookOpen;
  
  const typeColors = {
    note: 'bg-blue-500/10 text-blue-500',
    roadmap: 'bg-green-500/10 text-green-500',
    course: 'bg-purple-500/10 text-purple-500',
    video: 'bg-red-500/10 text-red-500',
    article: 'bg-indigo-500/10 text-indigo-500',
    practice_resource: 'bg-orange-500/10 text-orange-500',
    project_idea: 'bg-yellow-500/10 text-yellow-500',
    study_material: 'bg-teal-500/10 text-teal-500',
    tool: 'bg-pink-500/10 text-pink-500',
    community: 'bg-cyan-500/10 text-cyan-500',
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-4 hover:border-border hover:shadow-soft transition-all"
      >
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", typeColors[resource.type] || "bg-primary/10 text-primary")}>
            <TypeIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{resource.title}</h3>
              <span className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full capitalize">{resource.type.replace('_', ' ')}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{resource.description}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {resource.tags?.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full">#{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><EyeIcon className="w-4 h-4" />{(resource.views_count || 0).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Heart className={cn("w-4 h-4", hasUpvoted && "fill-current text-red-500")} />{(resource.upvotes_count || 0)}</span>
              <span className="flex items-center gap-1"><Bookmark className={cn("w-4 h-4", isSaved && "fill-current text-primary")} />{(resource.saves_count || 0)}</span>
              {resource.external_url && (
                <a href={resource.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" />View
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onUpvote(resource.id)} className={cn("p-2 rounded-lg transition-colors", hasUpvoted ? "bg-red-500/10 text-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10")}>
              <Heart className={cn("w-5 h-5", hasUpvoted && "fill-current")} />
            </button>
            <button onClick={() => onSave(resource.id)} className={cn("p-2 rounded-lg transition-colors", isSaved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}>
              <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
            </button>
            <button onClick={() => onReport(resource.id)} className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-soft h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", typeColors[resource.type] || "bg-primary/10 text-primary")}>
          <TypeIcon className="w-6 h-6" />
        </div>
        {resource.is_verified && (
          <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>
      
      <h3 className="font-semibold text-foreground mb-1 line-clamp-2">{resource.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{resource.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {resource.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground rounded-full">#{tag}</span>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 pt-3 border-t border-border/60">
        <span className="flex items-center gap-1"><EyeIcon className="w-4 h-4" />{(resource.views_count || 0).toLocaleString()}</span>
        <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{(resource.upvotes_count || 0)}</span>
        <span className="flex items-center gap-1"><Bookmark className="w-4 h-4" />{(resource.saves_count || 0)}</span>
      </div>
      
      <div className="flex gap-2 mt-auto">
        <button onClick={() => onUpvote(resource.id)} className={cn("flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm", hasUpvoted ? "bg-red-500/10 text-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10")}>
          <Heart className={cn("w-4 h-4", hasUpvoted && "fill-current")} />
          Upvote
        </button>
        <button onClick={() => onSave(resource.id)} className={cn("flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm", isSaved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}>
          <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          Save
        </button>
      </div>
    </motion.div>
  );
}

function CreateResourceModal({ categories, onClose }) {
  // Simplified for brevity
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
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Share a Resource</h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-muted-foreground text-center py-8">Resource creation form coming soon...</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResourceDetailModal({ resource, isSaved, onSave, onUpvote, onReport, onClose }) {
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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border/60 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">{resource.title}</h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-muted-foreground text-center py-8">Resource detail view coming soon...</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ResourcesPage;
