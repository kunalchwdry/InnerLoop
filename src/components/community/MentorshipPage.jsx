import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsProvider';
import {
  GraduationCap,
  Users,
  MessageSquare,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Filter,
  ArrowRight,
  Shield,
  BookOpen,
  Video,
  UserCheck,
  Zap,
  Award,
  Heart
} from 'lucide-react';

const MENTOR_TYPES = [
  { value: 'all', label: 'All Mentors', icon: GraduationCap },
  { value: 'roadmap', label: 'Roadmaps', icon: BookOpen },
  { value: 'qa', label: 'Q&A Sessions', icon: MessageSquare },
  { value: 'live', label: 'Live Sessions', icon: Video },
  { value: 'career', label: 'Career Guidance', icon: UserCheck },
];

const MENTOR_SPECIALIZATIONS = [
  'Frontend', 'Backend', 'Full Stack', 'Mobile', 'AI/ML',
  'Data Science', 'DevOps', 'Cybersecurity', 'DSA',
  'System Design', 'UI/UX', 'Cloud', 'Blockchain',
];

function MentorshipPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { createNotification } = useNotifications();
  
  const [mentors, setMentors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors'); // mentors, sessions, roadmaps, my-learning
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Load verified mentors
      const mentorsData = await db.entities.MentorProfile.filter({ 
        is_verified: true,
        is_active: true,
        accepting_mentees: true,
        _sort: '-average_rating,-total_sessions_hosted' 
      });
      setMentors(mentorsData || []);
      
      // Load upcoming sessions
      const sessionsData = await db.entities.MentorSession.filter({ 
        status: 'scheduled',
        scheduled_at: { _gte: new Date().toISOString() },
        _sort: 'scheduled_at',
        _limit: 20 
      });
      setSessions(sessionsData || []);
      
      // Load published roadmaps
      const roadmapsData = await db.entities.MentorRoadmap.filter({ 
        is_published: true,
        _sort: '-is_featured,-enrollments_count' 
      });
      setRoadmaps(roadmapsData || []);
      
      // Load my enrollments
      const enrollmentsData = await db.entities.MentorRoadmapEnrollment.filter({ 
        user_id: user.id 
      });
      setMyEnrollments(enrollmentsData || []);
      
      // Load my session registrations
      const registrationsData = await db.entities.MentorSessionRegistration.filter({ 
        user_id: user.id 
      });
      setMyRegistrations(registrationsData || []);
      
    } catch (error) {
      console.error('Error loading mentorship data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMentors = mentors.filter(m => {
    if (activeFilter !== 'all' && !m.specializations?.includes(activeFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return m.title?.toLowerCase().includes(query) ||
             m.expertise_areas?.some(e => e.toLowerCase().includes(query)) ||
             m.specializations?.some(s => s.toLowerCase().includes(query));
    }
    return true;
  });

  const handleRegisterSession = async (sessionId) => {
    try {
      const existing = await db.entities.MentorSessionRegistration.filter({ 
        session_id: sessionId, 
        user_id: user.id 
      });
      if (existing.length > 0) return;
      
      await db.entities.MentorSessionRegistration.create({
        session_id: sessionId,
        user_id: user.id,
        status: 'registered',
      });
      
      try {
        await createNotification({
          title: 'Session Registered!',
          content: 'You have successfully registered for the session.',
          type: 'achievement',
          action_url: '/community?tab=mentorship',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      loadData();
    } catch (error) {
      console.error('Error registering for session:', error);
    }
  };

  const handleEnrollRoadmap = async (roadmapId) => {
    try {
      const existing = await db.entities.MentorRoadmapEnrollment.filter({ 
        roadmap_id: roadmapId, 
        user_id: user.id 
      });
      if (existing.length > 0) return;
      
      await db.entities.MentorRoadmapEnrollment.create({
        roadmap_id: roadmapId,
        user_id: user.id,
        status: 'active',
      });
      
      try {
        await createNotification({
          title: 'Roadmap Enrolled!',
          content: 'You have successfully enrolled in the roadmap.',
          type: 'achievement',
          action_url: '/community?tab=mentorship',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      loadData();
    } catch (error) {
      console.error('Error enrolling in roadmap:', error);
    }
  };

  const isRegistered = (sessionId) => {
    return myRegistrations.some(r => r.session_id === sessionId);
  };

  const isEnrolled = (roadmapId) => {
    return myEnrollments.some(e => e.roadmap_id === roadmapId);
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
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-3xl font-bold text-foreground">Learn from Mentors</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Connect with verified mentors, join live sessions, and follow structured roadmaps.
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
              Mentorship
            </h1>

            <p className="text-muted-foreground mt-1">
              Learn from verified experts, join live sessions, and follow structured roadmaps
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-500 font-medium">
              Verified Mentors Only
            </span>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search mentors, skills, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Specializations</option>
          {MENTOR_SPECIALIZATIONS.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/60">
        {[
          { id: 'mentors', label: 'Mentors', icon: GraduationCap, count: filteredMentors.length },
          { id: 'sessions', label: 'Live Sessions', icon: Video, count: sessions.length },
          { id: 'roadmaps', label: 'Roadmaps', icon: BookOpen, count: roadmaps.length },
          { id: 'my-learning', label: 'My Learning', icon: Award, count: myEnrollments.length + myRegistrations.length },
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
        {activeTab === 'mentors' && (
          <MentorsTab
            key="mentors"
            mentors={filteredMentors}
            loading={loading}
          />
        )}
        
        {activeTab === 'sessions' && (
          <SessionsTab
            key="sessions"
            sessions={sessions}
            myRegistrations={myRegistrations}
            onRegister={handleRegisterSession}
            loading={loading}
          />
        )}
        
        {activeTab === 'roadmaps' && (
          <RoadmapsTab
            key="roadmaps"
            roadmaps={roadmaps}
            myEnrollments={myEnrollments}
            onEnroll={handleEnrollRoadmap}
            loading={loading}
          />
        )}
        
        {activeTab === 'my-learning' && (
          <MyLearningTab
            key="my-learning"
            myEnrollments={myEnrollments}
            myRegistrations={myRegistrations}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MentorsTab({ mentors, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-72 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className="text-center py-16">
        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No mentors found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mentors.map((mentor) => (
        <MentorCard key={mentor.id} mentor={mentor} />
      ))}
    </div>
  );
}

function MentorCard({ mentor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-soft h-full flex flex-col"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{mentor.title || 'Mentor'}</h3>
            <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Verified
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{mentor.company}</p>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{mentor.bio}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {mentor.expertise_areas?.slice(0, 4).map(exp => (
          <span key={exp} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{exp}</span>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-xl">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{mentor.average_rating?.toFixed(1) || '5.0'}</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{mentor.total_sessions_hosted || 0}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{mentor.total_mentees_helped || 0}</p>
          <p className="text-xs text-muted-foreground">Mentees</p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-auto">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
          <MessageSquare className="w-4 h-4" />
          Connect
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors">
          <ArrowRight className="w-4 h-4" />
          Profile
        </button>
      </div>
    </motion.div>
  );
}

function SessionsTab({ sessions, myRegistrations, onRegister, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const upcomingSessions = sessions.filter(s => new Date(s.scheduled_at) > new Date());
  const pastSessions = sessions.filter(s => new Date(s.scheduled_at) <= new Date());

  if (upcomingSessions.length === 0 && pastSessions.length === 0) {
    return (
      <div className="text-center py-16">
        <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No sessions scheduled</h3>
        <p className="text-muted-foreground">Check back later for upcoming mentor sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcomingSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Sessions ({upcomingSessions.length})
          </h3>
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isRegistered={isRegistered(session.id)}
                onRegister={onRegister}
              />
            ))}
          </div>
        </div>
      )}
      
      {pastSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Past Sessions ({pastSessions.length})
          </h3>
          <div className="space-y-3">
            {pastSessions.slice(0, 5).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isRegistered={isRegistered(session.id)}
                onRegister={onRegister}
                isPast={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, isRegistered, onRegister, isPast }) {
  const mentor = session.mentor; // Would need to fetch
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{session.title}</h3>
            <p className="text-sm text-muted-foreground">{session.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(session.scheduled_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {session.duration_minutes} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {session.current_participants}/{session.max_participants || '∞'}
              </span>
              {session.is_free && (
                <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full">Free</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          {isPast ? (
            <span className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg">Ended</span>
          ) : isRegistered ? (
            <button className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl font-medium" disabled>
              <CheckCircle className="w-4 h-4 mr-1" />
              Registered
            </button>
          ) : (
            <button
              onClick={() => onRegister(session.id)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Register
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function isRegistered(sessionId) {
  // This would check myRegistrations
  return false;
}

function RoadmapsTab({ roadmaps, myEnrollments, onEnroll, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-72 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No roadmaps published</h3>
        <p className="text-muted-foreground">Check back later for structured learning paths from mentors.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roadmaps.map((roadmap) => (
        <RoadmapCard
          key={roadmap.id}
          roadmap={roadmap}
          isEnrolled={myEnrollments.some(e => e.roadmap_id === roadmap.id)}
          onEnroll={onEnroll}
        />
      ))}
    </div>
  );
}

function RoadmapCard({ roadmap, isEnrolled, onEnroll }) {
  const mentor = roadmap.mentor; // Would need to fetch
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-soft h-full flex flex-col"
    >
      {roadmap.is_featured && (
        <div className="mb-3 text-center">
          <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full flex items-center gap-1 mx-auto">
            <Star className="w-3 h-3" />
            Featured
          </span>
        </div>
      )}
      
      <h3 className="font-semibold text-foreground mb-1">{roadmap.title}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{roadmap.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {roadmap.skills_covered?.slice(0, 4).map(skill => (
          <span key={skill} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{skill}</span>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-xl">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{roadmap.phases?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Phases</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{roadmap.estimated_duration_weeks || '?'}</p>
          <p className="text-xs text-muted-foreground">Weeks</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{roadmap.enrollments_count || 0}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-auto">
        {isEnrolled ? (
          <button className="flex-1 px-4 py-2 bg-green-500/10 text-green-500 rounded-xl font-medium" disabled>
            <CheckCircle className="w-4 h-4 mr-1" />
            Enrolled
          </button>
        ) : (
          <button
            onClick={() => onEnroll(roadmap.id)}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Enroll
          </button>
        )}
        <button className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors">
          <ArrowRight className="w-4 h-4 mr-1" />
          Details
        </button>
      </div>
    </motion.div>
  );
}

function MyLearningTab({ myEnrollments, myRegistrations, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (myEnrollments.length === 0 && myRegistrations.length === 0) {
    return (
      <div className="text-center py-16">
        <Award className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No active learning</h3>
        <p className="text-muted-foreground mb-6">Enroll in roadmaps or register for sessions to start learning.</p>
        <button onClick={() => setActiveTab('roadmaps')} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
          Browse Roadmaps
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {myEnrollments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            My Roadmaps ({myEnrollments.length})
          </h3>
          <div className="space-y-3">
            {myEnrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        </div>
      )}
      
      {myRegistrations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-500" />
            My Sessions ({myRegistrations.length})
          </h3>
          <div className="space-y-3">
            {myRegistrations.map((registration) => (
              <RegistrationCard key={registration.id} registration={registration} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnrollmentCard({ enrollment }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Roadmap Title</h4>
            <p className="text-sm text-muted-foreground">Phase {enrollment.current_phase} of {enrollment.roadmap?.phases?.length || '?'}</p>
            <div className="mt-2 h-2 bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${enrollment.progress_percentage || 0}%` }} />
            </div>
          </div>
        </div>
        <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary">
          {enrollment.progress_percentage || 0}%
        </span>
      </div>
    </motion.div>
  );
}

function RegistrationCard({ registration }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Session Title</h4>
            <p className="text-sm text-muted-foreground">Scheduled for {registration.session?.scheduled_at ? new Date(registration.session.scheduled_at).toLocaleDateString() : 'soon'}</p>
          </div>
        </div>
        <span className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-lg",
          registration.status === 'registered' ? "bg-blue-500/10 text-blue-500" :
          registration.status === 'attended' ? "bg-green-500/10 text-green-500" :
          "bg-muted text-muted-foreground"
        )}>
          {registration.status}
        </span>
      </div>
    </motion.div>
  );
}

export default MentorshipPage;
