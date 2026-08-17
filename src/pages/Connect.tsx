import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { MessageCircle, Send, Loader2, X, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

const AI_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/innerloop-ai`;

const SUGGESTIONS = [
  'Add a task called "Study Python" tomorrow',
  'What do I have scheduled today?',
  'What habits do I need to complete today?',
  'Mark my Python task as complete',
  'Help me plan my day',
];

export default function Connect() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from Supabase
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('created_by_id', user.id)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.timestamp || msg.created_at,
        })));
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          role,
          content,
          created_by_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const callAI = async (messageContent: string, conversationHistory: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: messageContent,
        conversation_history: conversationHistory.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
        tool_groups: ['tasks', 'habits', 'timetable', 'exercise', 'sleep', 'analytics', 'notifications'],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'AI request failed');
    }

    return {
      response: data.response,
      tool_calls: data.tool_calls || [],
    };
  };

  const handleSend = async (text?: string) => {
    const messageContent = (text || input).trim();
    if (!messageContent || isSending || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsSending(true);

    try {
      // Save user message to Supabase
      await saveMessage('user', messageContent);

      const result = await callAI(messageContent, messages);
      const aiResponse = result.response;
      const toolCalls = result.tool_calls || [];

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to Supabase
      await saveMessage('assistant', aiResponse);

      // Invalidate relevant queries if tool calls were made
      if (toolCalls.length > 0) {
        const affectedQueries: string[][] = [];
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          if (toolName.startsWith('create_') || toolName.startsWith('update_') || 
              toolName.startsWith('delete_') || toolName.startsWith('complete_') || 
              toolName.startsWith('toggle_') || toolName.startsWith('log_')) {
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

        for (const queryKey of affectedQueries) {
          queryClient.invalidateQueries({ queryKey });
        }
        
        console.log('[Connect] Invalidated queries:', affectedQueries);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.', 
        variant: 'destructive' 
      });
      // Remove the user message if AI failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-card rounded-3xl overflow-hidden shadow-soft border border-border/60">
      {/* Header */}
      <div className="bg-card px-5 py-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-base leading-tight">InnerLoop Connect</h2>
            <p className="text-xs text-muted-foreground leading-tight">A messaging interface for interacting with your InnerLoop AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" ref={messagesContainerRef}>
        {!isLoading && messages.length === 0 && showSuggestions ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 mb-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-premium">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">InnerLoop Connect</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Ask me anything — add tasks, check your schedule, manage habits, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-4 py-2 text-sm rounded-full border border-border/60 bg-card text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all shadow-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-3xl bg-muted flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-6">Send a message to get started</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-4 py-2 text-sm rounded-full border border-border/60 bg-card text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all shadow-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  message.role === 'user' ? "self-end flex-row-reverse ml-auto" : "self-start mr-auto"
                )}
              >
                <div className={cn(
                  "relative flex flex-col",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[75%] shadow-soft",
                    message.role === 'user'
                      ? "bg-gradient-to-br from-primary to-accent text-white rounded-br-md"
                      : "bg-muted/50 border border-border/60 text-foreground rounded-bl-md"
                  )}>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <span className="text-xs text-muted-foreground/70">{formatTime(message.created_at)}</span>
                    {message.role === 'assistant' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle className="w-3 h-3" />
                        <span>InnerLoop AI</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-2 flex items-center gap-2"
          >
            <div className="flex items-center gap-3 ml-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted/50 border border-border/60 rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="bg-card px-4 py-4 border-t border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2 bg-muted/50 rounded-2xl border border-border/60 px-4 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            disabled={isSending || isLoading}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none py-2"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending || isLoading}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              input.trim() && !isSending && !isLoading
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 hover:opacity-90"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2 text-center">
          InnerLoop AI can manage your schedule, habits, tasks, workouts and more.
        </p>
      </div>
    </div>
  );
}