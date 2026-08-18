import React, { useState, useEffect, useRef, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { MessageCircle, Send, Plus, Loader2, Search, MoreVertical, Edit2, Trash2, X, FileText, Menu, Sparkles, Mic, MicOff, Volume2, VolumeX, Brain, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import MessageBubble from '@/components/assistant/MessageBubble';
import ModeSelector, { MODES } from '@/components/assistant/ModeSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Conversation = {
  id: string
  metadata: { name: string; mode: string }
  created_date: string
  messages: Message[]
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const AGENT_NAME = 'innerloop_assistant';
const AI_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/innerloop-ai`;

const today = new Date().toISOString().split('T')[0];

const SUGGESTIONS_BY_MODE: Record<string, string[]> = {
  general: ['Plan my day', 'Help me stay focused', 'What should I work on?', 'Give me a productivity tip'],
  task:    ['Organize my tasks', 'Help me prioritize today', 'Break down a big goal', 'Plan my task deadlines'],
  timetable: ['Build my weekly schedule', 'Optimise my daily routine', 'Add a study block', 'Help me balance work and rest'],
  habit:   ['Track my habits today', 'Help me build a morning routine', 'Why am I breaking my habits?', 'Suggest a new habit'],
  therapist: ["I'm feeling overwhelmed", 'Help me reflect on my day', 'I need some motivation', "I'm struggling to stay consistent"],
};

export default function Assistant() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingConversation, setRenamingConversation] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [selectedMode, setSelectedMode] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Voice states - properly separated
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const currentModeConfig = MODES.find(m => m.id === selectedMode);

  // Check voice support on mount
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setVoiceSupported(supported);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Load conversations from localStorage
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem('innerloop_ai_conversations');
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    }
    setIsLoading(false);
  };

  const saveConversations = (convs: Conversation[]) => {
    try {
      localStorage.setItem('innerloop_ai_conversations', JSON.stringify(convs));
    } catch (e) {
      console.error('Error saving conversations:', e);
    }
  };

  const selectConversation = async (conversationId: string) => {
    setCurrentConversation(conversationId);
    setSidebarOpen(false);
    try {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setMessages(conv.messages || []);
      }
    } catch (e) {
      console.error('Error loading conversation:', e);
    }
  };

  const createNewConversation = async (modeId?: string) => {
    const mode = MODES.find(m => m.id === (modeId || selectedMode));
    setSidebarOpen(false);
    try {
      const newConv = {
        id: crypto.randomUUID(),
        metadata: { name: 'New Chat', mode: mode?.id || 'general' },
        created_date: new Date().toISOString(),
        messages: [],
      };
      
      setConversations(prev => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      setCurrentConversation(newConv.id);
      setMessages([]);

      if (mode?.systemPrompt) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I'm ready to help you in ${mode.label.toLowerCase()} mode. What would you like to do?`,
        }]);
      }
    } catch (e) {
      console.error('Error creating conversation:', e);
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim() || !renamingConversation) return;
    try {
      setConversations(prev => {
        const updated = prev.map(c => c.id === renamingConversation
          ? { ...c, metadata: { ...c.metadata, name: renameValue.trim() } }
          : c
        );
        saveConversations(updated);
        return updated;
      });
      setShowRenameDialog(false);
      setRenameValue('');
      setRenamingConversation(null);
    } catch (e) {
      console.error('Error renaming conversation:', e);
    }
  };

  const handleDelete = (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    const remaining = conversations.filter(c => c.id !== conversationId);
    setConversations(remaining);
    saveConversations(remaining);
    if (currentConversation === conversationId) {
      if (remaining.length > 0) {
        selectConversation(remaining[0].id);
      } else {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
  };

  const queryClient = useQueryClient();
  
  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
    setCurrentConversation(null);
    setMessages([]);
    setSummary('');
    setShowSummary(false);
  };

  // Call the AI Edge Function
  const callAI = useCallback(async (messageContent: string, conversationHistory: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Determine tool groups based on current mode
    const modeToolGroups: Record<string, string[]> = {
      general: ['tasks', 'habits', 'timetable', 'exercise', 'sleep', 'analytics', 'notifications'],
      task: ['tasks', 'analytics'],
      timetable: ['timetable', 'tasks', 'habits', 'analytics'],
      habit: ['habits', 'analytics'],
      therapist: ['habits', 'analytics'],
    };
    const tool_groups = modeToolGroups[selectedMode] || modeToolGroups.general;

    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: messageContent,
        conversation_history: conversationHistory,
        tool_groups,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'AI request failed');
    }

    return data.response;
  }, [selectedMode]);

  const handleSend = async (text: string) => {
    const messageContent = (text || input).trim();
    if (!messageContent || isSending || isProcessing) return;

    let convId = currentConversation;
    let currentMessages = messages;
    
    if (!convId) {
      const mode = MODES.find(m => m.id === selectedMode);
      const newConv = {
        id: crypto.randomUUID(),
        metadata: { name: 'New Chat', mode: mode?.id || 'general' },
        created_date: new Date().toISOString(),
        messages: [],
      };
      
      setConversations(prev => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      setCurrentConversation(newConv.id);
      convId = newConv.id;
      currentMessages = [];
    }

    const userMessage = { role: 'user' as const, content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    setIsProcessing(true);

    try {
      console.log('[AI] sending message:', messageContent);
      const response = await fetch(AI_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: messageContent,
          conversation_history: currentMessages,
          tool_groups: (() => {
            const modeToolGroups: Record<string, string[]> = {
              general: ['tasks', 'habits', 'timetable', 'exercise', 'sleep', 'analytics', 'notifications'],
              task: ['tasks', 'analytics'],
              timetable: ['timetable', 'tasks', 'habits', 'analytics'],
              habit: ['habits', 'analytics'],
              therapist: ['habits', 'analytics'],
            };
            return modeToolGroups[selectedMode] || modeToolGroups.general;
          })(),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      const aiResponse = data.response;
      const toolCalls = data.tool_calls || [];
      
      console.log('[AI] sending message:', messageContent);
      console.log('[AI] response received:', aiResponse);
      console.log('[AI] tool calls:', toolCalls);
      
      const assistantMessage = { role: 'assistant' as const, content: aiResponse };
      setMessages(prev => [...prev, assistantMessage]);
      
      setConversations(prev => {
        const updated = prev.map(c => c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, assistantMessage] }
          : c
        );
        saveConversations(updated);
        return updated;
      });
      
      // Invalidate relevant queries if tool calls were made
      if (toolCalls.length > 0) {
        const affectedQueries: string[][] = [];
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          if (toolName.startsWith('create_') || toolName.startsWith('update_') || toolName.startsWith('delete_') || toolName.startsWith('complete_') || toolName.startsWith('toggle_') || toolName.startsWith('log_')) {
            // Determine which queries to invalidate based on tool
            if (toolName.includes('task')) {
              affectedQueries.push(['tasks', 'all']);
              affectedQueries.push(['tasks', 'active']);
            }
            if (toolName.includes('habit')) {
              affectedQueries.push(['habits']);
              affectedQueries.push(['habitLogs']);
            }
            if (toolName.includes('timetable') || toolName.includes('schedule')) {
              affectedQueries.push(['timetableSlots']);
            }
            if (toolName.includes('exercise')) {
              affectedQueries.push(['exercises']);
              affectedQueries.push(['exerciseLogs']);
            }
            if (toolName.includes('sleep')) {
              affectedQueries.push(['sleepLogs']);
            }
          }
        }
        
        // Invalidate all affected queries
        for (const queryKey of affectedQueries) {
          queryClient.invalidateQueries({ queryKey });
        }
        
        console.log('[AI] Invalidated queries:', affectedQueries);
      }
      
      if (ttsEnabled) {
        speakText(aiResponse);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.', 
        variant: 'destructive' 
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
      setIsProcessing(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentConversation || messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    setSummary('');
    setShowSummary(true);
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      const summaryText = await callAI(
        `Please provide a concise summary of the following conversation. Focus on key topics discussed, main points, and any action items or decisions made:\n\n${conversationText}`,
        []
      );
      setSummary(summaryText || 'Failed to generate summary');
    } catch (e) {
      setSummary('Failed to generate summary. Please try again.');
    }
    setIsSummarizing(false);
  };

  // Initialize SpeechRecognition once
  const initSpeechRecognition = useCallback(() => {
    if (!voiceSupported) return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (interimTranscript) {
        setInput(finalTranscriptRef.current + interimTranscript);
      }
    };
    
    recognition.onend = () => {
      console.log('[VOICE] recognition ended, final transcript:', finalTranscriptRef.current);
      setIsListening(false);
      if (finalTranscriptRef.current.trim()) {
        const transcript = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = '';
        setInput(transcript);
        handleSend(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('[VOICE] Speech recognition error:', event.error);
      setIsListening(false);
      finalTranscriptRef.current = '';
      
      let errorMessage = 'Voice recognition failed';
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = 'Microphone permission is blocked. Please allow microphone access in your browser settings.';
          break;
        case 'no-speech':
          errorMessage = 'I didn\'t hear anything. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone was detected. Please check your microphone connection.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Voice input was cancelled.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service is not available.';
          break;
        default:
          errorMessage = `Voice error: ${event.error}`;
      }
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({ title: 'Voice Error', description: errorMessage, variant: 'destructive' });
      }
    };
    
    return recognition;
  }, [voiceSupported, toast]);

  // Start voice input
  const startVoiceInput = useCallback(async () => {
    if (!voiceSupported) {
      toast({ title: 'Not Supported', description: 'Voice input isn\'t supported in this browser. Please use Chrome or another supported browser.', variant: 'destructive' });
      return;
    }
    
    if (isListening || isProcessing || isSending) return;
    
    try {
      // Request microphone permission first
      console.log('[VOICE] Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[VOICE] Microphone permission granted');
      
      // Initialize recognition
      const recognition = initSpeechRecognition();
      if (!recognition) return;
      
      recognitionRef.current = recognition;
      finalTranscriptRef.current = '';
      setInput('');
      
      recognition.start();
      setIsListening(true);
      console.log('[VOICE] recognition started');
    } catch (error) {
      console.error('[VOICE] Error starting voice input:', error);
      let errorMessage = 'Could not access microphone';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access for this site.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone was detected. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Microphone is in use by another application.';
        }
      }
      toast({ title: 'Microphone Error', description: errorMessage, variant: 'destructive' });
      setIsListening(false);
    }
  }, [voiceSupported, isListening, isProcessing, isSending, initSpeechRecognition, toast]);

  // Stop voice input
  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log('[VOICE] Stopping recognition...');
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // Toggle voice input
  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  // Text-to-Speech
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      toast({ title: 'Not Supported', description: 'Text-to-speech not supported in this browser', variant: 'destructive' });
      return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                          voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
                          voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
      console.log('[TTS] Speaking started');
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log('[TTS] Speaking ended');
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event.error);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [toast]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      setTtsEnabled(prev => !prev);
      // If enabling TTS, speak the last assistant message
      if (!ttsEnabled) {
        const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMsg) {
          speakText(lastAssistantMsg.content);
        }
      }
    }
  }, [isSpeaking, ttsEnabled, messages, speakText, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const suggestions = SUGGESTIONS_BY_MODE[selectedMode] || SUGGESTIONS_BY_MODE.general;

  const inputPlaceholder = {
    therapist: "Share how you're feeling...",
    task: 'Add or organize tasks...',
    timetable: 'Plan your schedule...',
    habit: 'Talk about your habits...',
  }[selectedMode] || 'Type your message...';

  // Determine UI state
  const getVoiceState = () => {
    if (isListening) return { label: 'Listening...', icon: <Mic className="w-4 h-4 animate-pulse" />, className: 'text-rose-500 bg-rose-500/10', title: 'Stop listening' };
    if (isProcessing) return { label: 'Thinking...', icon: <Brain className="w-4 h-4 animate-spin" />, className: 'text-amber-500 bg-amber-500/10', title: 'Processing your request' };
    if (isSpeaking) return { label: 'Speaking...', icon: <Volume2 className="w-4 h-4 animate-pulse" />, className: 'text-blue-500 bg-blue-500/10', title: 'AI is speaking' };
    if (!voiceSupported) return { label: 'Voice unavailable', icon: <MicOff className="w-4 h-4" />, className: 'text-muted-foreground', title: 'Voice input not supported in this browser' };
    return { label: 'Talk to InnerLoop', icon: <Mic className="w-4 h-4" />, className: 'text-muted-foreground hover:text-foreground', title: 'Start voice input' };
  };

  const voiceState = getVoiceState();

  return (
    <div className="h-[calc(100vh-8rem)] flex relative overflow-hidden">

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-in Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="fixed top-0 left-0 z-50 h-full w-80 bg-card border-r border-border/60 shadow-premium flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <span className="font-semibold text-foreground text-base">Chats</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border/60">
              <Button onClick={() => createNewConversation()} className="w-full rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> New Chat
              </Button>
            </div>

            <div className="p-4 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 rounded-xl border-border/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative rounded-xl transition-all cursor-pointer",
                    currentConversation === conv.id
                      ? "bg-primary/10 dark:bg-primary/15"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div onClick={() => selectConversation(conv.id)} className="px-4 py-3 pr-10">
                    <div className="flex items-center gap-3">
                      <MessageCircle className={cn(
                        "w-4 h-4 flex-shrink-0",
                        currentConversation === conv.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "truncate text-sm font-medium",
                        currentConversation === conv.id ? "text-primary" : "text-foreground"
                      )}>
                        {conv.metadata?.name || 'New Chat'}
                      </span>
                    </div>
                    {conv.created_date && (
                      <p className="text-xs text-muted-foreground/70 mt-1 ml-7">
                        {new Date(conv.created_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setRenamingConversation(conv.id);
                          setRenameValue(conv.metadata?.name || '');
                          setShowRenameDialog(true);
                        }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(conv.id)} className="text-rose-600 dark:text-rose-400">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {filteredConversations.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{searchQuery ? 'No chats found' : 'No conversations yet'}</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-muted/40 dark:bg-card rounded-3xl overflow-hidden shadow-soft border border-border/60">

        {/* Top Header */}
        <div className="bg-card px-5 py-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={cn(
              "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md flex-shrink-0",
              currentModeConfig?.gradient || 'from-blue-500 to-blue-600'
            )}>
              {currentModeConfig && <currentModeConfig.icon className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-base leading-tight">
                {currentModeConfig?.label || 'InnerLoop AI'}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                {currentModeConfig?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentConversation && messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="flex items-center gap-1.5 text-xs rounded-xl"
              >
                {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
              </Button>
            )}
            {/* TTS Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTTS}
              className={cn("rounded-xl", ttsEnabled ? "text-primary" : "text-muted-foreground")}
              title={ttsEnabled ? 'Disable auto-speak' : 'Enable auto-speak'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {/* Voice Input Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceInput}
              disabled={isProcessing || isSending || !voiceSupported}
              className={cn("rounded-xl transition-all", voiceState.className)}
              title={voiceState.title}
            >
              {voiceState.icon}
            </Button>
          </div>
        </div>

        {/* Voice State Indicator */}
        {(isListening || isProcessing || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/60 flex items-center gap-3"
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isListening ? 'bg-rose-500 animate-pulse' :
                isProcessing ? 'bg-amber-500 animate-pulse' :
                'bg-blue-500 animate-pulse'
              )} />
              <span className="text-sm font-medium text-foreground">
                {isListening ? '🎙 Listening...' : isProcessing ? '🤔 Thinking...' : '🔊 Speaking...'}
              </span>
            </div>
            {isListening && (
              <span className="text-xs text-muted-foreground ml-auto flex-1 text-right truncate">
                {input || 'Speak now...'}
              </span>
            )}
          </motion.div>
        )}

        {/* Mode Chips */}
        <div className="bg-card border-b border-border/60 px-4 py-2.5 flex-shrink-0">
          <ModeSelector selectedMode={selectedMode} onSelect={handleModeSelect} />
        </div>

        {/* Summary Banner */}
        <AnimatePresence>
          {showSummary && summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-4 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl relative flex-shrink-0 overflow-hidden"
            >
              <button onClick={() => setShowSummary(false)} className="absolute top-2 right-2 p-1 hover:bg-primary/10 rounded-lg">
                <X className="w-4 h-4 text-primary" />
              </button>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 pr-4">
                  <h3 className="font-semibold text-foreground mb-1 text-sm">Chat Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {!currentConversation ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className={cn(
                "w-16 h-16 mb-5 rounded-3xl bg-gradient-to-br flex items-center justify-center shadow-premium",
                currentModeConfig?.gradient || 'from-blue-500 to-blue-600'
              )}>
                {currentModeConfig && <currentModeConfig.icon className="w-8 h-8 text-white" />}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {currentModeConfig?.label || 'InnerLoop AI'}
              </h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs">
                {currentModeConfig?.description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-4 py-2 text-sm rounded-full border border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-3xl bg-muted flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm mb-6">Send a message to get started</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-4 py-2 text-sm rounded-full border border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-card px-4 py-4 border-t border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl border border-border/60 px-4 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={inputPlaceholder}
              disabled={isSending || isProcessing || isListening}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none py-2"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceInput}
              disabled={isProcessing || isSending || !voiceSupported}
              className={cn("rounded-xl", voiceState.className)}
              title={voiceState.title}
            >
              {voiceState.icon}
            </Button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending || isProcessing}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                input.trim() && !isSending && !isProcessing
                  ? "bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/30 hover:opacity-90"
                  : "bg-muted text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-2 text-center">
            {selectedMode === 'therapist'
              ? 'Supportive space only — please consult a professional for serious concerns.'
              : 'InnerLoop AI can manage your schedule, habits, tasks, workouts and more.'}
          </p>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter chat name"
              onKeyPress={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}