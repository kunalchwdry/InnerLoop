import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { 
  Flame, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  ArrowRight, 
  Target, 
  Brain, 
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LearningResource = {
  id: string;
  title: string;
  platform: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: string;
  description: string;
  url: string;
  recommended_reason?: string;
};

type SubjectProgress = {
  id: string;
  name: string;
  color: string;
  icon: string;
  topics_completed: number;
  topics_total: number;
  current_topic?: string;
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'freeCodeCamp': () => <BookOpen className="w-4 h-4" />,
  'Khan Academy': () => <Brain className="w-4 h-4" />,
  'YouTube': () => <span className="text-red-500">▶</span>,
  'GeeksforGeeks': () => <Target className="w-4 h-4" />,
  'Documentation': () => <BookOpen className="w-4 h-4" />,
};

const CURATED_RESOURCES: LearningResource[] = [
  // Python resources
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    platform: 'freeCodeCamp',
    topic: 'Python',
    difficulty: 'beginner',
    estimated_duration: '~2 hours',
    description: 'Learn Python basics including variables, data types, control flow, functions, and basic data structures.',
    url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
    recommended_reason: 'Perfect starting point if you\'re new to Python programming.',
  },
  {
    id: 'python-data-structures',
    title: 'Data Structures in Python',
    platform: 'GeeksforGeeks',
    topic: 'Python',
    difficulty: 'intermediate',
    estimated_duration: '~3 hours',
    description: 'Deep dive into lists, tuples, dictionaries, sets, and their operations with practical examples.',
    url: 'https://www.geeksforgeeks.org/data-structures-in-python/',
    recommended_reason: 'Essential for building efficient Python applications.',
  },
  {
    id: 'python-oop',
    title: 'Object-Oriented Programming in Python',
    platform: 'freeCodeCamp',
    topic: 'Python',
    difficulty: 'intermediate',
    estimated_duration: '~2.5 hours',
    description: 'Master classes, inheritance, polymorphism, encapsulation, and design patterns in Python.',
    url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
    recommended_reason: 'Critical for organizing larger Python projects.',
  },
  
  // Data Structures & Algorithms
  {
    id: 'ds-arrays-linked-lists',
    title: 'Arrays & Linked Lists',
    platform: 'GeeksforGeeks',
    topic: 'Data Structures',
    difficulty: 'beginner',
    estimated_duration: '~2 hours',
    description: 'Fundamental linear data structures with implementation and common operations.',
    url: 'https://www.geeksforgeeks.org/data-structures/',
    recommended_reason: 'Foundation for all other data structures.',
  },
  {
    id: 'ds-trees',
    title: 'Binary Trees & BST',
    platform: 'GeeksforGeeks',
    topic: 'Data Structures',
    difficulty: 'intermediate',
    estimated_duration: '~3 hours',
    description: 'Tree traversals, binary search trees, AVL trees, and practical applications.',
    url: 'https://www.geeksforgeeks.org/binary-tree-data-structure/',
    recommended_reason: 'You\'re currently studying Trees - this is the perfect next step.',
  },
  {
    id: 'ds-graphs',
    title: 'Graph Algorithms',
    platform: 'GeeksforGeeks',
    topic: 'Data Structures',
    difficulty: 'advanced',
    estimated_duration: '~4 hours',
    description: 'BFS, DFS, Dijkstra, A*, minimum spanning trees, and graph applications.',
    url: 'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/',
    recommended_reason: 'Essential for competitive programming and system design.',
  },
  
  // Web Development
  {
    id: 'web-html-css',
    title: 'HTML & CSS Fundamentals',
    platform: 'freeCodeCamp',
    topic: 'Web Development',
    difficulty: 'beginner',
    estimated_duration: '~3 hours',
    description: 'Semantic HTML, CSS layout (Flexbox/Grid), responsive design, and modern practices.',
    url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
    recommended_reason: 'Start here if you want to build web interfaces.',
  },
  {
    id: 'web-javascript',
    title: 'JavaScript Algorithms & Data Structures',
    platform: 'freeCodeCamp',
    topic: 'Web Development',
    difficulty: 'beginner',
    estimated_duration: '~4 hours',
    description: 'ES6+, DOM manipulation, async JS, algorithms practice, and functional programming.',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    recommended_reason: 'Core language for web development.',
  },
  {
    id: 'web-react',
    title: 'React Frontend Development',
    platform: 'freeCodeCamp',
    topic: 'Web Development',
    difficulty: 'intermediate',
    estimated_duration: '~5 hours',
    description: 'Components, hooks, state management, routing, and building real applications.',
    url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/',
    recommended_reason: 'Modern framework for building interactive UIs.',
  },
  
  // Mathematics
  {
    id: 'math-linear-algebra',
    title: 'Linear Algebra Essentials',
    platform: 'Khan Academy',
    topic: 'Mathematics',
    difficulty: 'intermediate',
    estimated_duration: '~6 hours',
    description: 'Vectors, matrices, transformations, eigenvalues, and applications in ML.',
    url: 'https://www.khanacademy.org/math/linear-algebra',
    recommended_reason: 'Foundation for machine learning and computer graphics.',
  },
  {
    id: 'math-calculus',
    title: 'Calculus Fundamentals',
    platform: 'Khan Academy',
    topic: 'Mathematics',
    difficulty: 'intermediate',
    estimated_duration: '~8 hours',
    description: 'Limits, derivatives, integrals, and applications in optimization.',
    url: 'https://www.khanacademy.org/math/calculus-1',
    recommended_reason: 'Essential for understanding optimization and ML algorithms.',
  },
  
  // Machine Learning
  {
    id: 'ml-intro',
    title: 'Machine Learning Crash Course',
    platform: 'freeCodeCamp',
    topic: 'Machine Learning',
    difficulty: 'beginner',
    estimated_duration: '~3 hours',
    description: 'Supervised/unsupervised learning, model evaluation, and practical ML workflow.',
    url: 'https://www.freecodecamp.org/learn/machine-learning-with-python/',
    recommended_reason: 'Gentle introduction to ML concepts and practice.',
  },
];

export default function Learning() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'recommended' | 'continue' | 'subjects' | 'completed'>('recommended');
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [completedResources, setCompletedResources] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Load user's subject progress and completed resources
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Load subjects with topic progress
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id, name, color, icon,
          units (
            id, name,
            topics (id, name, completed)
          )
        `)
        .eq('created_by_id', user.id)
        .order('"order"', { ascending: true });

      if (subjectsError) throw subjectsError;

      const progress: SubjectProgress[] = (subjects || []).map(subject => {
        let topics_completed = 0;
        let topics_total = 0;
        let current_topic: string | undefined;

        subject.units?.forEach(unit => {
          unit.topics?.forEach(topic => {
            topics_total++;
            if (topic.completed) {
              topics_completed++;
            } else if (!current_topic) {
              current_topic = topic.name;
            }
          });
        });

        return {
          id: subject.id,
          name: subject.name,
          color: subject.color || '#3B82F6',
          icon: subject.icon || '📚',
          topics_completed,
          topics_total,
          current_topic,
        };
      });

      setSubjectProgress(progress);

      // Load completed resources from localStorage (for demo)
      const stored = localStorage.getItem(`innerloop_completed_resources_${user.id}`);
      if (stored) {
        setCompletedResources(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markResourceComplete = (resourceId: string) => {
    setCompletedResources(prev => {
      const next = new Set(prev);
      next.add(resourceId);
      localStorage.setItem(`innerloop_completed_resources_${user?.id}`, JSON.stringify([...next]));
      return next;
    });
    toast({ title: 'Progress saved', description: 'Resource marked as completed!' });
  };

  const openResource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getRecommendedResources = (): LearningResource[] => {
    // Filter based on user's current subjects and progress
    const userTopics = subjectProgress.flatMap(s => 
      s.current_topic ? [s.current_topic.toLowerCase()] : []
    );
    const userSubjects = subjectProgress.map(s => s.name.toLowerCase());

    return CURATED_RESOURCES.filter(resource => {
      const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           resource.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           resource.platform.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = difficultyFilter === 'all' || resource.difficulty === difficultyFilter;
      
      // Prioritize resources matching user's current study topics
      const isRelevant = userTopics.some(t => 
        resource.topic.toLowerCase().includes(t) || 
        resource.title.toLowerCase().includes(t)
      ) || userSubjects.some(s => 
        resource.topic.toLowerCase().includes(s)
      );

      return matchesSearch && matchesDifficulty;
    }).sort((a, b) => {
      // Sort: relevant first, then by difficulty (beginner first)
      const aRelevant = userTopics.some(t => 
        a.topic.toLowerCase().includes(t) || a.title.toLowerCase().includes(t)
      );
      const bRelevant = userTopics.some(t => 
        b.topic.toLowerCase().includes(t) || b.title.toLowerCase().includes(t)
      );
      if (aRelevant !== bRelevant) return bRelevant ? 1 : -1;
      
      const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      return diffOrder[a.difficulty] - diffOrder[b.difficulty];
    });
  };

  const getContinueLearningResources = (): LearningResource[] => {
    // Resources that match user's current topics but aren't completed
    const userSubjects = subjectProgress.map(s => s.name.toLowerCase());
    return CURATED_RESOURCES.filter(r => 
      userSubjects.some(s => r.topic.toLowerCase().includes(s)) &&
      !completedResources.has(r.id)
    ).slice(0, 6);
  };

  const getSubjectResources = (): Record<string, LearningResource[]> => {
    const grouped: Record<string, LearningResource[]> = {};
    CURATED_RESOURCES.forEach(resource => {
      if (!grouped[resource.topic]) grouped[resource.topic] = [];
      grouped[resource.topic].push(resource);
    });
    return grouped;
  };

  const generateTodaysPlan = async () => {
    if (!user) return;
    setIsGeneratingPlan(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      // Get user's current context for AI
      const [tasks, habits, timetable] = await Promise.all([
        supabase.from('tasks').select('*').eq('created_by_id', user.id).eq('completed', false).limit(10),
        supabase.from('habits').select('*').eq('created_by_id', user.id).eq('is_active', true),
        supabase.from('timetable_slots').select('*').eq('created_by_id', user.id).eq('date', new Date().toISOString().split('T')[0]),
      ]);

      const context = {
        subjects: subjectProgress.map(s => ({ name: s.name, progress: `${s.topics_completed}/${s.topics_total}`, current: s.current_topic })),
        pending_tasks: tasks.data?.length || 0,
        active_habits: habits.data?.length || 0,
        today_schedule: timetable.data?.length || 0,
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/innerloop-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: `Based on my current learning context, create a realistic "What should I learn today?" plan. Consider my subjects, available time, and current progress. Return a structured plan with time estimates. Context: ${JSON.stringify(context)}`,
          conversation_history: [],
          tool_groups: ['analytics'],
        }),
      });

      const data = await response.json();
      if (response.ok && data.response) {
        setTodaysPlan(data.response);
        setShowRecommendation(true);
      } else {
        // Fallback plan based on local data
        const fallbackPlan = generateFallbackPlan();
        setTodaysPlan(fallbackPlan);
        setShowRecommendation(true);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      const fallbackPlan = generateFallbackPlan();
      setTodaysPlan(fallbackPlan);
      setShowRecommendation(true);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const generateFallbackPlan = (): string => {
    const currentSubject = subjectProgress.find(s => s.current_topic);
    if (currentSubject) {
      return `Today's Learning Plan

📚 ${currentSubject.name} - ${currentSubject.current_topic}
⏱ 45 minutes - Core concepts & examples

💪 Practice Problems  
⏱ 30 minutes - Hands-on exercises

🔁 Revision
⏱ 15 minutes - Review key concepts`;
    }
    
    if (subjectProgress.length > 0) {
      const subject = subjectProgress[0];
      return `Today's Learning Plan

📚 ${subject.name} - Continue Learning
⏱ 45 minutes - Next topic: ${subject.current_topic || 'Review fundamentals'}

💪 Practice Problems  
⏱ 30 minutes - Apply what you learned

🔁 Revision
⏱ 15 minutes - Quick review`;
    }

    return `Today's Learning Plan

🎯 Pick a Subject to Start
⏱ 45 minutes - Choose from Subjects tab

💪 Practice Problems  
⏱ 30 minutes - Try related exercises

🔁 Revision
⏱ 15 minutes - Reflect on progress`;
  };

  const filteredRecommended = getRecommendedResources();
  const continueResources = getContinueLearningResources();
  const subjectResources = getSubjectResources();

  const renderResourceCard = (resource: LearningResource, showReason = true) => {
    const isCompleted = completedResources.has(resource.id);
    const PlatformIcon = PLATFORM_ICONS[resource.platform] || (() => <BookOpen className="w-4 h-4" />);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <Card className={cn(
          "h-full transition-all hover:shadow-lg hover:border-primary/20",
          isCompleted && "opacity-60 ring-2 ring-green-500/30"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <PlatformIcon className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">{resource.platform}</span>
                  <span className={cn("px-2 py-0.5 text-xs rounded-full", DIFFICULTY_COLORS[resource.difficulty])}>
                    {resource.difficulty}
                  </span>
                </div>
                <CardTitle className={cn("text-base truncate", isCompleted && "line-through text-muted-foreground")}>
                  {resource.title}
                </CardTitle>
              </div>
              {isCompleted && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.description}</p>
            
            {showReason && resource.recommended_reason && (
              <div className="mb-3 p-2 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                <p className="text-xs text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {resource.recommended_reason}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{resource.estimated_duration}</span>
              </div>
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="sm"
                onClick={() => isCompleted ? markResourceComplete(resource.id) : openResource(resource.url)}
                disabled={isCompleted}
                className="gap-1.5"
              >
                {isCompleted ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <span>Start Learning</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning Hub</h1>
          <p className="text-muted-foreground mt-1">
            Discover resources tailored to your learning journey
          </p>
        </div>
        <Button
          variant="outline"
          onClick={generateTodaysPlan}
          disabled={isGeneratingPlan}
          className="gap-2"
        >
          <Sparkles className={cn("w-4 h-4", isGeneratingPlan && "animate-spin")} />
          <span>{isGeneratingPlan ? 'Generating...' : 'What should I learn today?'}</span>
        </Button>
      </div>

      {/* Today's Plan Banner */}
      <AnimatePresence>
        {showRecommendation && todaysPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="relative bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 mb-4"
          >
            <button 
              onClick={() => setShowRecommendation(false)} 
              className="absolute top-3 right-3 p-1 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Today's Learning Plan
                </h3>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{todaysPlan}</pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="border-b border-border/60">
        <nav className="flex gap-1 pb-px" role="tablist">
          {[
            { id: 'recommended', label: '🔥 Recommended For You', icon: Flame },
            { id: 'continue', label: 'Continue Learning', icon: Clock },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'completed', label: 'Completed', icon: CheckCircle },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 rounded-xl border-border/60"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter as any}>
          <SelectTrigger className="w-[180px] bg-muted/50 rounded-xl border-border/60">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {activeTab === 'recommended' && (
        <div>
          {filteredRecommended.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No resources match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecommended.map(resource => renderResourceCard(resource, true))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'continue' && (
        <div>
          {continueResources.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No resources in progress. Start learning from Recommended!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueResources.map(resource => renderResourceCard(resource, false))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {Object.entries(subjectResources).map(([subject, resources]) => (
            <div key={subject}>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {subject}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map(resource => renderResourceCard(resource, true))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'completed' && (
        <div>
          {completedResources.size === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No completed resources yet. Start learning to see progress here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CURATED_RESOURCES
                .filter(r => completedResources.has(r.id))
                .map(resource => renderResourceCard(resource, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}