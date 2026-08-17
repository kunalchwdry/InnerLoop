import React, { useState, useEffect } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

import { Brain, Bell, Palette, User, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import PageHeader from '../components/common/PageHeader';
import { PageTransition, fadeUp, staggerContainer } from '../components/common/motion';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    ai_accuracy: 'balanced',
    ai_behavior: 'flexible',
    reminders_enabled: true,
    daily_summary: true,
    theme_preference: 'light',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;
    if (user?.settings) {
      setSettings({ ...settings, ...user.settings });
    }
  }, [user, isAuthenticated, isLoadingAuth]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await db.auth.updateMe({ settings });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('Failed to save settings');
    }
    setIsSaving(false);
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        <PageHeader title="Settings" subtitle="Customize your InnerLoop experience" />

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={fadeUp}>
            <SettingsSection icon={Brain} tone="blue" title="AI Assistant Settings" subtitle="Control how the AI behaves and responds">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Response Accuracy Level</Label>
                  <Select value={settings.ai_accuracy} onValueChange={(v) => updateSetting('ai_accuracy', v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast - Quick responses, less detailed</SelectItem>
                      <SelectItem value="balanced">Balanced - Good mix of speed and accuracy</SelectItem>
                      <SelectItem value="high">High Accuracy - Detailed and thorough responses</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {settings.ai_accuracy === 'fast' && 'AI will respond quickly with concise answers.'}
                    {settings.ai_accuracy === 'balanced' && 'AI will balance response time with detail.'}
                    {settings.ai_accuracy === 'high' && 'AI will take more time to provide comprehensive answers.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">AI Behavior Mode</Label>
                  <Select value={settings.ai_behavior} onValueChange={(v) => updateSetting('ai_behavior', v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Strict - Follows timetable & habits strictly</SelectItem>
                      <SelectItem value="flexible">Flexible - Adaptive guidance based on situation</SelectItem>
                      <SelectItem value="supportive">Supportive - Encouraging and understanding</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {settings.ai_behavior === 'strict' && 'AI will remind you strictly about your schedule and habits.'}
                    {settings.ai_behavior === 'flexible' && 'AI will adapt recommendations based on your current situation.'}
                    {settings.ai_behavior === 'supportive' && 'AI will focus on encouragement and positive reinforcement.'}
                  </p>
                </div>
              </div>
            </SettingsSection>
          </motion.div>

          <motion.div variants={fadeUp}>
            <SettingsSection icon={Bell} tone="amber" title="Reminders & Notifications" subtitle="Manage how you stay updated">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Enable Reminders</Label>
                    <p className="text-sm text-muted-foreground mt-1">Get reminders for habits and scheduled activities</p>
                  </div>
                  <Switch checked={settings.reminders_enabled} onCheckedChange={(checked) => updateSetting('reminders_enabled', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Daily Summary</Label>
                    <p className="text-sm text-muted-foreground mt-1">Receive a summary of your day at the end</p>
                  </div>
                  <Switch checked={settings.daily_summary} onCheckedChange={(checked) => updateSetting('daily_summary', checked)} />
                </div>
              </div>
            </SettingsSection>
          </motion.div>

          <motion.div variants={fadeUp}>
            <SettingsSection icon={Palette} tone="violet" title="Appearance" subtitle="Customize the look and feel">
              <div className="space-y-3">
                <Label className="text-base font-medium">Theme Preference</Label>
                <Select value={settings.theme_preference} onValueChange={(v) => updateSetting('theme_preference', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="dark">Dark Mode</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Choose your preferred theme or let it follow your system settings</p>
              </div>
            </SettingsSection>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center justify-between bg-card rounded-3xl border border-border/60 shadow-soft p-6">
            <div>
              {saveMessage && (
                <p className={cn("text-sm font-medium", saveMessage.includes('success') ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {saveMessage}
                </p>
              )}
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Settings</>
              )}
            </Button>
          </motion.div>

          {user && (
            <motion.div variants={fadeUp}>
              <SettingsSection icon={User} tone="slate" title="Account Information" subtitle="Your account details">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="text-base font-medium text-foreground">{user.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="text-base font-medium text-foreground">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Role</Label>
                    <p className="text-base font-medium text-foreground capitalize">{user.role}</p>
                  </div>
                </div>
              </SettingsSection>
            </motion.div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}

const sectionTones = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
  amber: 'from-amber-400 to-amber-500 shadow-amber-500/25',
  violet: 'from-violet-500 to-violet-600 shadow-violet-500/25',
  slate: 'from-slate-500 to-slate-600 shadow-slate-500/25',
};

function SettingsSection({ icon: Icon, tone, title, subtitle, children }) {
  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-soft overflow-hidden">
      <div className="p-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", sectionTones[tone])}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}