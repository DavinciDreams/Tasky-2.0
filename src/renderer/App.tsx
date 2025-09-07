import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Lazy-load heavy emoji picker to reduce initial bundle size
const EmojiPicker = React.lazy(() => import('@emoji-mart/react'));
import { SettingSection } from '../components/SettingSection';
import { SettingItem } from '../components/SettingItem';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { GoogleAIProvider, GOOGLE_AI_MODELS } from '../ai/providers';
import { Checkbox } from '../components/ui/checkbox';
import CustomSwitch from '../components/ui/CustomSwitch';
import { Bell, Settings, Smile, X, Plus, Edit2, Edit3, Trash2, Clock, Calendar, Minus, Paperclip, CheckSquare, Upload } from 'lucide-react';
import type { Reminder, Settings as AppSettings, CustomAvatar, DefaultAvatar } from '../types';
import type { TaskyTask, TaskyTaskSchema } from '../types/task';
import { TasksTab } from '../components/tasks/TasksTab';
import { ApplicationsTab } from '../components/apps/ApplicationsTab';
import LocationDateTime from '../components/ui/LocationDateTime';
import '../types/css.d.ts';

// Build a list of IANA timezones (fallback) if Intl doesn't expose them
const IANA_TIMEZONES: string[] = [
  'UTC','Etc/UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Amsterdam','Europe/Brussels','Europe/Zurich','Europe/Stockholm','Europe/Oslo','Europe/Copenhagen','Europe/Warsaw','Europe/Prague','Europe/Vienna','Europe/Budapest','Europe/Athens','Europe/Helsinki','Europe/Kiev','Europe/Istanbul','Europe/Moscow',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','America/Halifax','America/St_Johns','America/Toronto','America/Vancouver','America/Mexico_City','America/Bogota','America/Lima','America/Sao_Paulo','America/Argentina/Buenos_Aires',
  'Asia/Tokyo','Asia/Seoul','Asia/Shanghai','Asia/Hong_Kong','Asia/Singapore','Asia/Taipei','Asia/Bangkok','Asia/Jakarta','Asia/Kuala_Lumpur','Asia/Manila','Asia/Colombo','Asia/Kolkata','Asia/Dubai','Asia/Riyadh','Asia/Jerusalem',
  'Australia/Sydney','Australia/Melbourne','Australia/Brisbane','Australia/Perth','Pacific/Auckland','Pacific/Honolulu',
  'Africa/Cairo','Africa/Johannesburg','Africa/Nairobi'
];

function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function getAllTimezones(): string[] {
  // Some environments expose supportedValuesOf
  // @ts-ignore
  if (Intl.supportedValuesOf) {
    try {
      // @ts-ignore
      const list = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length) return list as string[];
    } catch {}
  }
  return IANA_TIMEZONES;
}

// Component Props Interfaces
interface RemindersTabProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRemoveReminder: (id: string) => void;
  onEditReminder: (id: string, updates: Partial<Reminder>) => void;
  onToggleReminder: (id: string, enabled: boolean) => void;
  timeFormat: '12h' | '24h';
}

interface SettingsTabProps {
  settings: AppSettings;
  onSettingChange: (key: keyof AppSettings, value: any) => void;
  onTestNotification: () => void;
}

interface AvatarTabProps {
  selectedAvatar: string;
  onAvatarChange: (avatarName: string) => void;
}

interface ReminderFormProps {
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditReminder?: (id: string, updates: Partial<Reminder>) => void;
  editingReminder?: Reminder | null;
  onCancelEdit?: () => void;
  timeFormat: '12h' | '24h';
}

interface ReminderItemProps {
  reminder: Reminder;
  onRemove: () => void;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  timeFormat: '12h' | '24h';
}

// TaskyAvatarImage Component - displays the Tasky mascot image
const TaskyAvatarImage = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadTaskyImage = async () => {
      try {
        const dataUrl = await window.electronAPI.invoke('get-tasky-avatar-data-url');
        if (dataUrl) {
          setImageSrc(dataUrl);
        } else {
          setImageError(true);
        }
      } catch (error) {
        console.error('Failed to load Tasky avatar image:', error);
        setImageError(true);
      }
    };

    loadTaskyImage();
  }, []);

  if (imageError || !imageSrc) {
    return <span className="text-3xl">🎯</span>;
  }

  return (
    <div className="w-12 h-12 flex items-center justify-center">
      <img 
        src={imageSrc}
        alt="Tasky" 
        className="w-10 h-10 object-cover rounded-lg"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

// Reminders Tab Component
const RemindersTab: React.FC<RemindersTabProps> = ({ reminders, onAddReminder, onRemoveReminder, onEditReminder, onToggleReminder, timeFormat }) => {
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-0 h-full flex flex-col">
      <Card className="flex-1 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
            <div className="p-6">
              <div className="reminders-header text-center mb-6">
                <h1 className="text-2xl font-bold text-card-foreground">
                  🔔 Reminders
                </h1>
                <p className="text-muted-foreground mt-1 text-center">
                  Set up daily and one-time reminders with notifications
                </p>
              </div>
              
              <div className="mb-6">
                <ReminderForm 
                  onAddReminder={onAddReminder}
                  onEditReminder={onEditReminder}
                  editingReminder={editingReminder}
                  onCancelEdit={() => setEditingReminder(null)}
                  timeFormat={timeFormat}
                />
              </div>

              <div className="min-h-0">
              {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Bell size={32} className="text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Plus size={14} className="text-yellow-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No reminders set</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Create your first reminder above to start building your productivity habits!
                </p>
              </div>
              ) : (
              <div className="grid gap-4">
                {reminders.map((reminder, index) => (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ReminderItem
                      reminder={reminder}
                      onRemove={() => onRemoveReminder(reminder.id)}
                      onEdit={() => {
                        setEditingReminder(reminder);
                        // Scroll to top when editing starts
                        setTimeout(() => {
                          scrollContainerRef.current?.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                          });
                        }, 100);
                      }}
                      onToggle={(enabled) => onToggleReminder(reminder.id, enabled)}
                      timeFormat={timeFormat}
                    />
                  </motion.div>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Settings Tab Component
const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSettingChange, onTestNotification }) => {
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestStatus, setLlmTestStatus] = useState<null | { ok: boolean; message: string }>(null);

  // Get available models for the current provider (only used for Google now)
  const getAvailableModels = (provider: string) => {
    const normalizedProvider = provider.toLowerCase();
    
    if (normalizedProvider === 'google') {
      // Get models from exported constant
      return GOOGLE_AI_MODELS.map(model => ({
        value: model,
        label: model
          .replace('gemini-', 'Gemini ')
          .replace('-', ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
      }));
    }
    
    return [];
  };

  const testAIProvider = async () => {
    setLlmTesting(true);
    setLlmTestStatus(null);
    const provider = String(settings.llmProvider || 'google').toLowerCase();
    try {
      if (provider === 'google') {
        const key = (settings.llmApiKey || '').trim();
        if (!key) {
          throw new Error('Enter an API key first.');
        }
        
        // Force a valid Google AI model if an incompatible one is selected
        let modelId = String(settings.llmModel || 'gemini-1.5-flash');
        
        // Check if the current model is a Google/Gemini model
        if (!modelId.includes('gemini')) {
          console.warn(`Model "${modelId}" is not compatible with Google AI. Using gemini-1.5-flash instead.`);
          modelId = 'gemini-1.5-flash';
        }
        
        console.log('Testing Google AI with model:', modelId);
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Hello' }]
            }],
            generationConfig: {
              maxOutputTokens: 10
            }
          })
        });
        
        console.log('Google AI test response status:', res.status, res.statusText);
        
        if (res.ok) {
          const responseData = await res.json();
          console.log('Google AI test response:', responseData);
          setLlmTestStatus({ ok: true, message: 'Google AI' });
        } else {
          const j = await res.json().catch(() => ({} as any));
          console.error('Google AI test failed:', j);
          const err = (j && j.error && j.error.message) ? j.error.message : `${res.status} ${res.statusText}`;
          setLlmTestStatus({ ok: false, message: `Google AI - ${err}` });
        }
      } else {
        const baseURL = (settings.llmBaseUrl || 'http://localhost:1234/v1').trim();
        const url = baseURL.replace(/\/$/, '') + '/models';
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          const j = await res.json().catch(() => ({} as any));
          const models = (j && (j.data || j.models)) || j;
          let count = 0;
          if (Array.isArray(models)) count = models.length;
          else if (models && Array.isArray(models.data)) count = models.data.length;
          setLlmTestStatus({ ok: true, message: 'Custom' });
        } else {
          setLlmTestStatus({ ok: false, message: 'Custom' });
        }
      }
    } catch (e: any) {
      console.error('AI Provider test error:', e);
      setLlmTestStatus({ ok: false, message: `${provider === 'google' ? 'Google AI' : 'LM Studio'} - ${e.message}` });
    } finally {
      setLlmTesting(false);
    }
  };
  return (
    <div className="space-y-8 h-full">
      <div className="pb-2">
        <Card className="bg-card border-border/30 shadow-2xl card rounded-3xl backdrop-blur-sm max-w-5xl mx-auto">
          <CardContent className="space-y-6 p-8">
          <SettingSection title="Notifications & Alerts" icon="🔔">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingItem
              icon="🔔"
              title="Enable Notifications"
              description="Receive desktop notifications for your reminders"
              type="switch"
              value={settings.enableNotifications}
              onChange={(checked) => onSettingChange('enableNotifications', checked)}
              />
              <SettingItem
              icon="🔊"
              title="Sound Alerts"
              description="Play notification sounds when reminders trigger"
              type="switch"
              value={settings.enableSound}
              onChange={(checked) => onSettingChange('enableSound', checked)}
              />
              <SettingItem
              icon="🎨"
              title="Notification Color"
              description="Choose the background color for popup notifications"
              type="color"
              value={settings.notificationColor || '#7f7f7c'}
              onChange={(color) => onSettingChange('notificationColor', color)}
              />
              <SettingItem
              icon="🔤"
              title="Notification Font"
              description="Select the font family for notification text"
              type="select"
              value={settings.notificationFont || 'system'}
              options={[
                { value: 'system', label: 'System Default', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
                { value: 'Arial', label: 'Arial', fontFamily: 'Arial, sans-serif' },
                { value: 'Times New Roman', label: 'Times New Roman', fontFamily: '"Times New Roman", serif' },
                { value: 'Georgia', label: 'Georgia', fontFamily: 'Georgia, serif' },
                { value: 'Verdana', label: 'Verdana', fontFamily: 'Verdana, sans-serif' },
                { value: 'Helvetica', label: 'Helvetica', fontFamily: 'Helvetica, sans-serif' },
                { value: 'Courier New', label: 'Courier New', fontFamily: '"Courier New", monospace' },
                { value: 'Trebuchet MS', label: 'Trebuchet MS', fontFamily: '"Trebuchet MS", sans-serif' },
                { value: 'Comic Sans MS', label: 'Comic Sans MS', fontFamily: '"Comic Sans MS", cursive' }
              ]}
              onChange={(font) => onSettingChange('notificationFont', font)}
              />
              <SettingItem
              icon="🌈"
              title="Notification Text Color"
              description="Choose the text color for popup notifications"
              type="color"
              value={settings.notificationTextColor || '#ffffff'}
              onChange={(color) => onSettingChange('notificationTextColor', color)}
              />
            </div>
          </SettingSection>

          <SettingSection title="Desktop Avatar" icon="🤖">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingItem
              icon="🤖"
              title="Desktop Companion"
              description="Show/Hide your Avatar "
              type="switch"
              value={settings.enableAssistant}
              onChange={(checked) => onSettingChange('enableAssistant', checked)}
              />
              <SettingItem
              icon="🔓"
              title="Enable Dragging"
              description="Allow dragging the assistant"
              type="switch"
              value={settings.enableDragging}
              onChange={(checked) => onSettingChange('enableDragging', checked)}
              />
              <SettingItem
              icon="✨"
              title="Avatar Animations"
              description="Enable bouncing and hover animations for your companion"
              type="switch"
              value={settings.enableAnimation}
              onChange={(checked) => onSettingChange('enableAnimation', checked)}
              />
              <SettingItem
              icon="📌"
              title="Desktop Layer"
              description="Pin Avatar above or below other windows"
              type="switch"
              value={settings.assistantLayer === 'below'}
              onChange={(checked) => onSettingChange('assistantLayer', checked ? 'below' : 'above')}
              />
              <SettingItem
              icon="💬"
              title="Notification Position"
              description="Choose which side notification bubbles appear on"
              type="switch"
              value={settings.bubbleSide === 'right'}
              onChange={(checked) => onSettingChange('bubbleSide', checked ? 'right' : 'left')}
              />
            </div>
          </SettingSection>

          <SettingSection title="System" icon="⚙️">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingItem
              icon="⚡"
              title="Auto Start"
              description="Launch Tasky automatically when Windows starts"
              type="switch"
              value={settings.autoStart}
              onChange={(checked) => onSettingChange('autoStart', checked)}
              />
              <SettingItem
              icon="🕐"
              title="Time Format"
              description="Choose between 12-hour and 24-hour time display"
              type="switch"
              value={settings.timeFormat === '24h'}
              onChange={(checked) => onSettingChange('timeFormat', checked ? '24h' : '12h')}
              />
              <SettingItem
                icon="🌍"
                title="Timezone"
                description="Set the timezone used for reminders"
                type="select"
                value={settings.timezone || getSystemTimezone()}
                options={getAllTimezones().map(tz => ({ value: tz, label: tz }))}
                onChange={(tz) => onSettingChange('timezone', tz)}
              />
            </div>
          </SettingSection>

          <SettingSection title="AI Providers" icon="🤖">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingItem
                icon="🏷️"
                title="Provider"
                description="Choose the AI provider to use across the app"
                type="select"
                value={settings.llmProvider || 'google'}
                options={[
                  { value: 'google', label: 'Google AI' },
                  { value: 'lmstudio', label: 'LM Studio' },
                ]}
                onChange={(val) => {
                  onSettingChange('llmProvider', val);
                  // Auto-set appropriate default model for each provider
                  if (val === 'google') {
                    onSettingChange('llmModel', 'gemini-1.5-flash');
                  } else if (val === 'lmstudio') {
                    onSettingChange('llmModel', 'llama-3.2-1b-instruct');
                  }
                }}
              />

              {/* Model selector: use select for Google; show LM Studio models for LM Studio */}
              {['google'].includes(String(settings.llmProvider || 'google').toLowerCase()) ? (
                <div className="md:col-span-2">
                  <SettingItem
                    icon="🧠"
                    title="Model"
                    description="Choose a suggested model for the selected provider"
                    type="select"
                    value={settings.llmModel || 'gemini-1.5-flash'}
                    options={(() => {
                      // Get models dynamically from AI providers
                      const availableModels = getAvailableModels(settings.llmProvider || 'google');
                      if (availableModels.length > 0) {
                        return availableModels;
                      }
                      
                      // Fallback for Google AI models
                      return [
                        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
                        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
                        { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest' },
                      ];
                    })()}
                    onChange={(val) => onSettingChange('llmModel', val)}
                  />
                </div>
              ) : settings.llmProvider === 'lmstudio' ? (
                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-col gap-2 py-2 px-4 rounded-xl hover:bg-muted/30 transition-colors duration-200">
                    <Label className="text-sm">API Identifier</Label>
                    <Input
                      type="text"
                      placeholder="llama-3.2-1b-instruct"
                      value={settings.llmModel || ''}
                      onChange={(e) => onSettingChange('llmModel', e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      The exact model identifier shown in LM Studio (e.g., llama-3.2-1b-instruct)
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 py-2 px-4 rounded-xl hover:bg-muted/30 transition-colors duration-200">
                    <Label className="text-sm">Local Server</Label>
                    <Input
                      type="text"
                      placeholder="http://127.0.0.1:1234"
                      value={settings.llmBaseUrl || ''}
                      onChange={(e) => onSettingChange('llmBaseUrl', e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      LM Studio server address (default: http://127.0.0.1:1234)
                    </span>
                  </div>
                </div>
              ) : (
                null
              )}

              {/* API Key for Google only */}
              {settings.llmProvider === 'google' && (
                <div className="flex flex-col gap-2 py-2 px-4 rounded-xl hover:bg-muted/30 transition-colors duration-200">
                  <Label className="text-sm">API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter API key"
                    value={settings.llmApiKey || ''}
                    onChange={(e) => onSettingChange('llmApiKey', e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Stored locally.
                  </span>
                </div>
              )}

              <div className="md:col-span-2 flex items-center gap-3 py-2 px-4 rounded-xl hover:bg-muted/30 transition-colors duration-200">
                <Button onClick={testAIProvider} disabled={llmTesting} className="rounded-xl bg-white text-gray-900 hover:bg-gray-100">
                  {llmTesting ? 'Testing…' : 'Test Connection'}
                </Button>
                {llmTestStatus && (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${llmTestStatus.ok ? 'text-green-500' : 'text-red-500'}`}>
                      {llmTestStatus.ok ? '✓ Pass' : '✗ Failed'}
                    </span>
                    {!llmTestStatus.ok && llmTestStatus.message.toLowerCase().includes('google') && (
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Get API Key
                      </a>
                    )}
                  </div>
                )}
              </div>

              {false && null}
            </div>
          </SettingSection>
          
          <div className="pt-6 border-t border-border/30">
            <Button 
              className="w-full bg-white hover:bg-gray-100 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl py-3 font-semibold"
              onClick={onTestNotification}
            >
              <Bell size={18} className="mr-3" />
              Test Notification
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Avatar Tab Component
const AvatarTab: React.FC<AvatarTabProps> = ({ selectedAvatar, onAvatarChange }) => {
  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>([]);
  const [avatarDataUrls, setAvatarDataUrls] = useState<Record<string, string>>({});

  const defaultAvatars: DefaultAvatar[] = [
    { name: 'Tasky', label: '🎯 Tasky', description: 'Your intelligent task assistant', type: 'default' }
  ];

  // Load custom avatars on component mount
  useEffect(() => {
    loadCustomAvatars();
  }, []);

  const loadCustomAvatars = async () => {
    try {
      const savedCustomAvatars = await window.electronAPI.getSetting('customAvatars');
      console.log('📋 Loaded custom avatars from storage:', savedCustomAvatars);
      
      if (savedCustomAvatars && Array.isArray(savedCustomAvatars)) {
        // Clean up old descriptions and ensure consistent format
        const cleanedAvatars: CustomAvatar[] = savedCustomAvatars.map(avatar => ({
          ...avatar,
          type: 'custom' as const,
          description: avatar.description === 'Custom uploaded image' ? '' : (avatar.description || '')
        }));
        setCustomAvatars(cleanedAvatars);
        
        // Load data URLs for all custom avatars
        const dataUrlPromises = cleanedAvatars.map(async (avatar) => {
          if (avatar.filePath) {
            console.log('🖼️ Loading avatar data URL for:', avatar.name, 'from path:', avatar.filePath);
            const dataUrl = await window.electronAPI.getAvatarDataUrl(avatar.filePath);
            console.log('📸 Got data URL for', avatar.name, ':', dataUrl ? 'SUCCESS' : 'FAILED');
            return { name: avatar.name, dataUrl };
          }
          return { name: avatar.name, dataUrl: null };
        });
        
        const dataUrlResults = await Promise.all(dataUrlPromises);
        const newDataUrls: Record<string, string> = {};
        dataUrlResults.forEach(result => {
          if (result.dataUrl) {
            newDataUrls[result.name] = result.dataUrl;
          }
        });
        console.log('🎯 Final avatar data URLs:', newDataUrls);
        setAvatarDataUrls(newDataUrls);
        
        // Save the cleaned version back to storage
        if (JSON.stringify(cleanedAvatars) !== JSON.stringify(savedCustomAvatars)) {
          window.electronAPI.setSetting('customAvatars', cleanedAvatars);
        }
      }
    } catch (error) {
      console.error('Failed to load custom avatars:', error);
    }
  };

  const handleCustomAvatarUpload = async () => {
    try {
      const filePath = await window.electronAPI.selectAvatarFile();
      if (filePath) {
        // Create a unique name for the custom avatar
        const fileName = filePath.split('/').pop()?.split('\\').pop();
        const cleanName = fileName ? fileName.split('.')[0] : 'custom'; // Remove file extension
        const avatarName = `custom_${Date.now()}`;
        const newCustomAvatar: CustomAvatar = {
          name: avatarName,
          label: cleanName, // Just the clean filename without emoji or extension
          description: '', // Remove the "Custom uploaded image" text
          type: 'custom',
          filePath: filePath
        };
        
        const updatedCustomAvatars = [...customAvatars, newCustomAvatar];
        setCustomAvatars(updatedCustomAvatars);
        
        // Load data URL for the new avatar
        const dataUrl = await window.electronAPI.getAvatarDataUrl(filePath);
        if (dataUrl) {
          setAvatarDataUrls(prev => ({
            ...prev,
            [avatarName]: dataUrl
          }));
        }
        
        // Save custom avatars list
        window.electronAPI.setSetting('customAvatars', updatedCustomAvatars);
        
        // Set as selected avatar
        onAvatarChange(avatarName);
        window.electronAPI.setSetting('customAvatarPath', filePath);
      }
    } catch (error) {
      console.error('Failed to upload custom avatar:', error);
    }
  };

  const handleDeleteCustomAvatar = async (avatarName: string) => {
    const updatedCustomAvatars = customAvatars.filter(avatar => avatar.name !== avatarName);
    setCustomAvatars(updatedCustomAvatars);
    
    // Save updated list
    window.electronAPI.setSetting('customAvatars', updatedCustomAvatars);
    
    // If the deleted avatar was selected, switch to Tasky
    if (selectedAvatar === avatarName) {
      onAvatarChange('Tasky');
    }
  };

  // Combine default and custom avatars
  const allAvatars = [...defaultAvatars, ...customAvatars];

  return (
    <div className="space-y-8 h-full">
      <div className="h-full flex flex-col p-1">
        <Card className="flex-1 bg-card border-border/30 shadow-2xl card rounded-3xl backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-8">
            {/* Default Avatar */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Default Avatar
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {defaultAvatars.map((avatar, index) => (
                  <motion.div
                    key={avatar.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card 
                      className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden rounded-2xl ${
                        selectedAvatar === avatar.name 
                          ? 'ring-2 ring-primary/50 bg-primary/5 border-primary/30 shadow-lg' 
                          : 'bg-card hover:bg-secondary/10 border-border/30 shadow-md'
                      }`}
                      onClick={() => onAvatarChange(avatar.name)}
                    >
                      <CardContent className="flex flex-col items-center text-center p-4 relative h-36">
                        <div className={`relative text-3xl mb-2 transition-transform duration-300 ${
                          selectedAvatar === avatar.name ? 'scale-110' : 'group-hover:scale-105'
                        }`}>
                          {avatar.name === 'Tasky' ? (
                            <TaskyAvatarImage />
                          ) : (
                            avatar.label.split(' ')[0]
                          )}
                          {selectedAvatar === avatar.name && (
                            <motion.div 
                              className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", duration: 0.3 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </div>
                        <div className="font-medium text-sm mb-1 text-foreground">
                          {avatar.label.split(' ').slice(1).join(' ')}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed text-center px-1 max-w-full">
                          {avatar.description}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Custom Avatars */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Custom Avatars
                </h3>
              </div>
              
                {customAvatars.length === 0 ? (
                <div className="py-4">
                  <Button
                    onClick={handleCustomAvatarUpload}
                    className="bg-white hover:bg-gray-100 text-gray-900 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border border-border/30"
                  >
                    Upload Avatar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={handleCustomAvatarUpload}
                      className="bg-white hover:bg-gray-100 text-gray-900 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border border-border/30"
                    >
                      <Plus size={14} className="mr-2" />
                      Add More
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {customAvatars.map((avatar, index) => (
                    <motion.div
                      key={avatar.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card 
                        className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden rounded-2xl ${
                          selectedAvatar === avatar.name 
                            ? 'ring-2 ring-primary/50 bg-primary/5 border-primary/30 shadow-lg' 
                            : 'bg-card hover:bg-secondary/10 border-border/30 shadow-md'
                        }`}
                        onClick={async () => {
                          console.log('Selecting custom avatar:', avatar.name, 'with path:', avatar.filePath);
                          // Set the custom avatar path FIRST
                          await window.electronAPI.setSetting('customAvatarPath', avatar.filePath);
                          // Then change the avatar
                          onAvatarChange(avatar.name);
                        }}
                      >
                        <CardContent className="flex flex-col items-center text-center p-4 relative h-36">
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomAvatar(avatar.name);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete custom avatar"
                          >
                            <X size={10} />
                          </button>
                          
                          <div className={`relative text-3xl mb-2 transition-transform duration-300 ${
                            selectedAvatar === avatar.name ? 'scale-110' : 'group-hover:scale-105'
                          }`}>
                            {avatarDataUrls[avatar.name] ? (
                              <img 
                                src={avatarDataUrls[avatar.name]}
                                alt={avatar.label}
                                className="w-12 h-12 object-cover rounded-lg"
                                onLoad={() => {
                                  console.log('✅ Custom avatar preview loaded successfully:', avatar.filePath);
                                }}
                                onError={(e) => {
                                  console.error('❌ Custom avatar failed to load, trying file path directly:', avatar.filePath);
                                  // Try loading directly from file path
                                  (e.target as HTMLImageElement).src = `file:///${avatar.filePath.replace(/\\/g, '/')}`;
                                }}
                              />
                            ) : (
                              <div className="text-2xl font-bold text-foreground">
                                {avatar.label}
                              </div>
                            )}
                            {selectedAvatar === avatar.name && (
                              <motion.div 
                                className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.3 }}
                              >
                                ✓
                              </motion.div>
                            )}
                          </div>
                          <div className="font-medium text-sm mb-1 text-foreground truncate w-full">
                            {avatar.label}
                          </div>
                          {avatar.description && avatar.description !== 'Custom uploaded image' && (
                            <div className="text-xs text-muted-foreground leading-relaxed text-center px-1 max-w-full">
                              {avatar.description}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                    ))}
                  </div>
                  <div className="text-center mt-6">
                    <p className="text-xs text-muted-foreground/70">
                      JPG, PNG, GIF, BMP, WebP • 128x128px+
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ReminderForm: React.FC<ReminderFormProps> = ({ onAddReminder, onEditReminder, editingReminder, onCancelEdit, timeFormat }) => {
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('09:00');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const [oneTime, setOneTime] = useState(false);
  const [errors, setErrors] = useState<{ message?: string; days?: string }>({});
  const [days, setDays] = useState<{[key: string]: boolean}>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  // Helper functions for time format conversion
  const formatTimeFor12Hour = (hour24: string) => {
    const hour = parseInt(hour24);
    if (hour === 0) return '12';
    if (hour <= 12) return hour.toString();
    return (hour - 12).toString();
  };

  const getAmPm = (hour24: string) => {
    return parseInt(hour24) < 12 ? 'AM' : 'PM';
  };

  const convertTo24Hour = (hour12: string, ampm: string) => {
    let hour = parseInt(hour12);
    if (ampm === 'AM' && hour === 12) hour = 0;
    if (ampm === 'PM' && hour !== 12) hour += 12;
    return hour.toString().padStart(2, '0');
  };

  // Populate form when editing
  useEffect(() => {
    if (editingReminder) {
      setMessage(editingReminder.message);
      setTime(editingReminder.time);
      setOneTime(editingReminder.oneTime || false);
      const dayObj: {[key: string]: boolean} = {};
      Object.keys(days).forEach(day => {
        dayObj[day] = editingReminder.days.includes(day);
      });
      setDays(dayObj);
    }
  }, [editingReminder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setErrors(prev => ({ ...prev, message: 'Please enter a reminder message' }));
      return;
    } else {
      if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
    }

    const selectedDays = Object.keys(days).filter(day => days[day]);
    if (selectedDays.length === 0) {
      setErrors(prev => ({ ...prev, days: 'Please select at least one day' }));
      return;
    } else {
      if (errors.days) setErrors(prev => ({ ...prev, days: undefined }));
    }

    const reminder = {
      message: message.trim(),
      time,
      days: selectedDays,
      enabled: true,
      oneTime: oneTime,
    };

    if (editingReminder && onEditReminder) {
      onEditReminder(editingReminder.id, reminder);
      if (onCancelEdit) onCancelEdit();
      // Reset form after editing
      setMessage('');
      setTime('09:00');
      setOneTime(false);
      setDays({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      });
    } else {
      onAddReminder(reminder);
      // Reset form after adding
      setMessage('');
      setTime('09:00');
      setOneTime(false);
      setDays({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      });
      setErrors({});
    }
  };

  const handleDayChange = (day: string) => {
    setDays({ ...days, [day]: !days[day] });
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && event.target && (event.target as Element).closest && !(event.target as Element).closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Load emoji data only when the picker is opened to reduce initial bundle size
  useEffect(() => {
    if (showEmojiPicker && !emojiData) {
      import('@emoji-mart/data').then((m: any) => setEmojiData(m.default || m)).catch(() => {});
    }
  }, [showEmojiPicker, emojiData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {editingReminder && (
        <motion.div 
          className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <Edit3 size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="font-medium text-amber-800 dark:text-amber-200">Editing Reminder</span>
          </div>
          <Button 
            type="button" 
            onClick={onCancelEdit} 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl py-2 px-4 font-semibold"
          >
            Cancel
          </Button>
        </motion.div>
      )}
      
      <div className="space-y-3">
        <Label htmlFor="message" className="text-sm font-medium text-card-foreground flex items-center gap-2">
          Reminder Message
        </Label>
        <div className="relative emoji-picker-container">
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., Time to stand up and stretch!"
            maxLength={100}
            rows={2}
            className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 pr-12 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl placeholder:text-muted-foreground resize-none break-words whitespace-normal"
            style={{
              backgroundColor: '#464647',
              color: '#ffffff'
            }}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'message-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 top-4 text-xl hover:scale-110 transition-transform duration-200 focus:outline-none"
            aria-label="Add emoji"
          >
            😊
          </button>
          
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 shadow-xl z-50"
            >
              <Suspense fallback={null}>
                {emojiData && (
                  <EmojiPicker
                    data={emojiData}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    set="native"
                    showPreview={false}
                    showSkinTones={false}
                    emojiSize={20}
                    perLine={8}
                    maxFrequentRows={2}
                  />
                )}
              </Suspense>
            </motion.div>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-right">
          {message.length}/100 characters
        </div>
        {errors.message && (
          <div id="message-error" className="text-xs text-red-400 mt-1">{errors.message}</div>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="time" className="text-sm font-medium text-card-foreground flex items-center gap-2">
          <Clock size={16} />
          Time
        </Label>
        {timeFormat === '24h' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hour</label>
              <select
                value={time.split(':')[0]}
                onChange={(e) => setTime(`${e.target.value}:${time.split(':')[1]}`)}
                className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#464647',
                  color: '#ffffff'
                }}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <option key={hour} value={hour} style={{ backgroundColor: '#464647', color: '#ffffff' }}>
                      {hour}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Minute</label>
              <select
                value={time.split(':')[1]}
                onChange={(e) => setTime(`${time.split(':')[0]}:${e.target.value}`)}
                className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#464647',
                  color: '#ffffff'
                }}
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const minute = i.toString().padStart(2, '0');
                  return (
                    <option key={minute} value={minute} style={{ backgroundColor: '#464647', color: '#ffffff' }}>
                      {minute}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hour</label>
              <select
                value={formatTimeFor12Hour(time.split(':')[0])}
                onChange={(e) => {
                  const currentAmPm = getAmPm(time.split(':')[0]);
                  const new24Hour = convertTo24Hour(e.target.value, currentAmPm);
                  setTime(`${new24Hour}:${time.split(':')[1]}`);
                }}
                className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#464647',
                  color: '#ffffff'
                }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const hour = (i + 1).toString();
                  return (
                    <option key={hour} value={hour} style={{ backgroundColor: '#464647', color: '#ffffff' }}>
                      {hour}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Minute</label>
              <select
                value={time.split(':')[1]}
                onChange={(e) => setTime(`${time.split(':')[0]}:${e.target.value}`)}
                className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#464647',
                  color: '#ffffff'
                }}
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const minute = i.toString().padStart(2, '0');
                  return (
                    <option key={minute} value={minute} style={{ backgroundColor: '#464647', color: '#ffffff' }}>
                      {minute}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">AM/PM</label>
              <select
                value={getAmPm(time.split(':')[0])}
                onChange={(e) => {
                  const currentHour12 = formatTimeFor12Hour(time.split(':')[0]);
                  const new24Hour = convertTo24Hour(currentHour12, e.target.value);
                  setTime(`${new24Hour}:${time.split(':')[1]}`);
                }}
                className="w-full bg-card text-card-foreground border border-border/30 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: '#464647',
                  color: '#ffffff'
                }}
              >
                <option value="AM" style={{ backgroundColor: '#464647', color: '#ffffff' }}>AM</option>
                <option value="PM" style={{ backgroundColor: '#464647', color: '#ffffff' }}>PM</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/20 border border-border/20">
          <Label className="text-sm font-medium text-card-foreground flex items-center gap-2">
            <Clock size={16} />
            One-time reminder
            <span className="text-xs text-muted-foreground ml-2">(Triggers once then disables)</span>
          </Label>
          <CustomSwitch
            checked={oneTime}
            onChange={() => setOneTime(!oneTime)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-card-foreground flex items-center gap-2">
          <Calendar size={16} />
          {oneTime ? 'Trigger day' : 'Days of the week'}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(days).map(day => (
            <div key={day} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/10 transition-all duration-200 hover:scale-105">
              <Label
                htmlFor={day}
                className="text-sm font-medium cursor-pointer text-card-foreground"
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Label>
              <CustomSwitch
                checked={days[day]}
                onChange={() => handleDayChange(day)}
                disabled={oneTime && Object.values(days).filter(v => v).length > 0 && !days[day]}
              />
            </div>
          ))}
        </div>
        {oneTime && (
          <p className="text-xs text-muted-foreground mt-2">
            For one-time reminders, select the day when it should trigger.
          </p>
        )}
        {errors.days && (
          <div className="text-xs text-red-400 mt-1">{errors.days}</div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-white hover:bg-gray-100 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl py-3 font-semibold"
      >
        <Plus size={18} className="mr-3" />
        {editingReminder ? "Update Reminder" : "Add Reminder"}
      </Button>
    </form>
  );
};

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, onRemove, onEdit, onToggle, timeFormat }) => {
  const formatTimeDisplay = (time24: string) => {
    if (timeFormat === '24h') {
      return time24;
    } else {
      const [hour, minute] = time24.split(':');
      const hour24 = parseInt(hour);
      let hour12 = hour24;
      let ampm = 'AM';
      
      if (hour24 === 0) {
        hour12 = 12;
      } else if (hour24 > 12) {
        hour12 = hour24 - 12;
        ampm = 'PM';
      } else if (hour24 === 12) {
        ampm = 'PM';
      }
      
      return `${hour12}:${minute} ${ampm}`;
    }
  };

  const formatDays = (days: string[]) => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && weekdays.every(day => days.includes(day))) return 'Weekdays';
    if (days.length === 2 && weekends.every(day => days.includes(day))) return 'Weekends';
    
    return days.length + ' days';
  };

  const isEnabled = reminder.enabled !== false;

  const handleToggleChange = (checked: boolean) => {
    console.log('Toggle changed to:', checked, 'for reminder:', reminder.id);
    onToggle(checked);
  };

  return (
    <div className={`bg-secondary/30 border-2 border-border/40 rounded-lg p-4 space-y-3 transition-opacity duration-200 hover:bg-secondary/40 hover:border-border/60 ${!isEnabled ? 'opacity-60' : ''}`}>
      {/* Reminder message and toggle */}
      <div className="flex items-start justify-between gap-4">
        <h3 className={`font-medium text-base flex-1 break-all leading-relaxed ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`} style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
          {reminder.message}
        </h3>
        <Checkbox
          checked={isEnabled}
          onChange={() => {}} // Required by component interface
          onCheckedChange={handleToggleChange}
          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
      </div>
      
      {/* Time and schedule info */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span>{formatTimeDisplay(reminder.time)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{formatDays(reminder.days)}</span>
        </div>
        {reminder.oneTime && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-md font-medium">
              One-time
            </span>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button 
          size="icon"
          onClick={onEdit}
          variant="outline"
          className="h-8 w-8 rounded-xl hover:bg-muted"
          title="Edit Reminder"
          aria-label="Edit reminder"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button 
          size="icon"
          onClick={onRemove}
          variant="outline"
          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Delete Reminder"
          aria-label="Delete reminder"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('applications');
  const [activeAppView, setActiveAppView] = useState<'home' | 'reminders' | 'tasks' | 'chat' | 'pomodoro'>('home');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // Debug: Log reminders state changes
  useEffect(() => {
    // renderer: reduce noise; keep only critical errors in console
  }, [reminders]);
  const [tasks, setTasks] = useState<TaskyTask[]>([]);
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    enableSound: true,
    enableAssistant: true,
    enableNotifications: true,
    autoStart: false,
    notificationType: 'custom',
    selectedAvatar: 'Tasky',
    enableAnimation: true,
    timeFormat: '24h', // '12h' or '24h'
    enableDragging: true, // false = click-through, true = draggable
    assistantLayer: 'above', // 'above' = above windows, 'below' = below windows
    bubbleSide: 'left', // 'left' or 'right' bubble position
  });

  useEffect(() => {
    // Load initial data when component mounts
    loadReminders();
    loadTasks();
    loadSettings();
    
    // Add keyboard shortcut for quitting (Ctrl+Q)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'q') {
        event.preventDefault();
        window.electronAPI.forceQuit();
      }
    };
    
    // Global event handlers to route events to desktop assistant
    const handleTaskCreated = (event: CustomEvent) => {
      const task = event.detail;
      window.electronAPI.showAssistant(`✅ Task created: ${task?.title || 'New task'}`);
    };
    
    const handleTaskCompleted = (event: CustomEvent) => {
      const task = event.detail;
      window.electronAPI.showAssistant(`🎉 Task completed: ${task?.title || 'Task done'}! Great job!`);
    };
    
    const handleTaskUpdated = (event: CustomEvent) => {
      const task = event.detail;
      window.electronAPI.showAssistant(`📝 Task updated: ${task?.title || 'Task modified'}`);
    };
    
    const handleTaskDeleted = (event: CustomEvent) => {
      const task = event.detail;
      window.electronAPI.showAssistant(`🗑️ Task deleted: ${task?.title || 'Task removed'}`);
    };
    
    const handleTaskOverdue = (event: CustomEvent) => {
      const task = event.detail;
      window.electronAPI.showAssistant(`⚠️ Task overdue: ${task?.title || 'Overdue task'}! Please check it.`);
    };
    
    const handleMcpTool = (event: CustomEvent) => {
      const { phase, name } = event.detail;
      if (phase === 'start') {
        const toolMessages = {
          'tasky_create_task': '🎯 Creating task...',
          'tasky_update_task': '📝 Updating task...',
          'tasky_delete_task': '🗑️ Deleting task...',
          'tasky_execute_task': '⚡ Executing task...',
          'tasky_create_reminder': '⏰ Creating reminder...',
          'tasky_list_tasks': '📋 Listing tasks...',
          'tasky_list_reminders': '📋 Listing reminders...'
        };
        const message = toolMessages[name as keyof typeof toolMessages] || '🔧 Working...';
        window.electronAPI.showAssistant(message);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    // Listen for task reload events from child components (e.g., import)
    const onReload = () => loadTasks();
    window.addEventListener('tasky:reload-tasks', onReload as any);
    
    // Route task and tool events to desktop assistant
    window.addEventListener('task:created', handleTaskCreated as any);
    window.addEventListener('task:completed', handleTaskCompleted as any);
    window.addEventListener('task:updated', handleTaskUpdated as any);
    window.addEventListener('task:deleted', handleTaskDeleted as any);
    window.addEventListener('task:overdue', handleTaskOverdue as any);
    window.addEventListener('tasky:tool', handleMcpTool as any);
    
    // Removed JSON file change listener; DB polling handles external updates
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('tasky:reload-tasks', onReload as any);
      // Clean up event listeners
      window.removeEventListener('task:created', handleTaskCreated as any);
      window.removeEventListener('task:completed', handleTaskCompleted as any);
      window.removeEventListener('task:updated', handleTaskUpdated as any);
      window.removeEventListener('task:deleted', handleTaskDeleted as any);
      window.removeEventListener('task:overdue', handleTaskOverdue as any);
      window.removeEventListener('tasky:tool', handleMcpTool as any);
      // No-op: JSON file watcher removed in DB-only mode
    };
  }, []);

  // Push updates from main process instead of polling
  useEffect(() => {
    try {
      (window as any).electronAPI.onTasksUpdated(() => {
        loadTasks();
      });
    } catch {}
    return () => {
      try { (window as any).electronAPI.removeAllListeners('tasky:tasks-updated'); } catch {}
    };
  }, []);

  useEffect(() => {
    try {
      (window as any).electronAPI.onRemindersUpdated(() => {
        loadReminders();
      });
    } catch {}
    return () => {
      try { (window as any).electronAPI.removeAllListeners('tasky:reminders-updated'); } catch {}
    };
  }, []);

  const loadReminders = async () => {
    try {
      
      const savedReminders = await window.electronAPI.getReminders();
      
      // Ensure all reminders have an enabled property (default to true for backwards compatibility)
      const remindersWithEnabled = ((savedReminders || []) as Reminder[]).map((reminder: Reminder) => ({
        ...reminder,
        enabled: reminder.enabled !== undefined ? reminder.enabled : true
      }));
      
      setReminders(remindersWithEnabled);
      
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const enableSound = await window.electronAPI.getSetting('enableSound');
      const enableAssistant = await window.electronAPI.getSetting('enableAssistant');
      const enableNotifications = await window.electronAPI.getSetting('enableNotifications');
      const autoStart = await window.electronAPI.getSetting('autoStart');
      const notificationType = await window.electronAPI.getSetting('notificationType');
      const selectedAvatar = await window.electronAPI.getSetting('selectedAvatar');
      const timeFormat = await window.electronAPI.getSetting('timeFormat');
      const timezone = await window.electronAPI.getSetting('timezone');
      const enableDragging = await window.electronAPI.getSetting('enableDragging');
      const assistantLayer = await window.electronAPI.getSetting('assistantLayer');
      const bubbleSide = await window.electronAPI.getSetting('bubbleSide');
      const enableAnimationSetting = await window.electronAPI.getSetting('enableAnimation');
      
      // Load LLM settings
      const llmProvider = await window.electronAPI.getSetting('llmProvider');
      const llmApiKey = await window.electronAPI.getSetting('llmApiKey');
      const llmModel = await window.electronAPI.getSetting('llmModel');
      const llmBaseUrl = await window.electronAPI.getSetting('llmBaseUrl');
      const llmSystemPrompt = await window.electronAPI.getSetting('llmSystemPrompt');
      const llmUseCustomPrompt = await window.electronAPI.getSetting('llmUseCustomPrompt');
      
      setSettings({
        enableSound: enableSound !== undefined ? enableSound : true,
        enableAssistant: enableAssistant !== undefined ? enableAssistant : true,
        enableNotifications: enableNotifications !== undefined ? enableNotifications : true,
        autoStart: autoStart !== undefined ? autoStart : false,
        notificationType: notificationType !== undefined ? notificationType : 'custom',
        selectedAvatar: selectedAvatar !== undefined ? selectedAvatar : 'Tasky',
        enableAnimation: enableAnimationSetting !== undefined ? enableAnimationSetting : true,
        timeFormat: timeFormat === '24' ? '24h' : timeFormat === '12' ? '12h' : (timeFormat || '24h'),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        enableDragging: enableDragging !== undefined ? enableDragging : true,
        assistantLayer: assistantLayer !== undefined ? assistantLayer : 'above',
        bubbleSide: bubbleSide !== undefined ? bubbleSide : 'left',
        // LLM settings
        llmProvider: llmProvider || 'google',
        llmApiKey: llmApiKey || '',
        llmModel: llmModel || 'o4-mini',
        llmBaseUrl: llmBaseUrl || '',
        llmSystemPrompt: llmSystemPrompt || '',
        llmUseCustomPrompt: llmUseCustomPrompt || false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const result = await window.electronAPI.getTasks();
      setTasks(result || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleAddReminder = (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReminder = {
      id: Date.now().toString(),
      ...reminder,
      enabled: true, // Default to enabled
    };
    
    window.electronAPI.addReminder(newReminder);
    setReminders([...reminders, newReminder]);
  };

  const handleRemoveReminder = (id: string) => {
    window.electronAPI.removeReminder(id);
    setReminders(reminders.filter(reminder => reminder.id !== id));
  };

  const handleEditReminder = (id: string, updatedReminder: Partial<Reminder>) => {
    window.electronAPI.updateReminder(id, updatedReminder);
    setReminders(reminders.map(reminder => 
      reminder.id === id ? { ...reminder, ...updatedReminder, id } : reminder
    ));
  };

  const handleToggleReminder = (id: string, enabled: boolean) => {
    console.log('Toggling reminder:', id, 'to enabled:', enabled);
    const updatedReminder = reminders.find(r => r.id === id);
    if (updatedReminder) {
      const newReminder = { ...updatedReminder, enabled };
      console.log('Updated reminder:', newReminder);
      window.electronAPI.updateReminder(id, newReminder);
      setReminders(reminders.map(reminder => 
        reminder.id === id ? newReminder : reminder
      ));
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    window.electronAPI.setSetting(key, value);
    
    if (key === 'enableNotifications') {
      window.electronAPI.toggleReminders(value);
    }
    
    if (key === 'enableDragging') {
      window.electronAPI.toggleAssistantDragging(value);
    }
    
    if (key === 'assistantLayer') {
      window.electronAPI.setAssistantLayer(value);
    }
    
    if (key === 'bubbleSide') {
      window.electronAPI.setBubbleSide(value);
    }
  };

  const handleTestNotification = () => {
    window.electronAPI.testNotification();
  };

  // Task management handlers
  const handleCreateTask = async (taskInput: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => {
    try {
      const created = await window.electronAPI.createTask(taskInput);
      if (created) {
        // Reload to ensure consistency from main process
        await loadTasks();
        // Emit event for desktop assistant
        window.dispatchEvent(new CustomEvent('task:created', { detail: created }));
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<TaskyTask>) => {
    try {
      const updated = await window.electronAPI.updateTask(id, updates);
      if (updated) {
        setTasks(prev => prev.map(t => (t.schema.id === id ? updated : t)));
        // Emit appropriate events for desktop assistant
        if (updates.status === 'COMPLETED') {
          window.dispatchEvent(new CustomEvent('task:completed', { detail: updated }));
        } else {
          window.dispatchEvent(new CustomEvent('task:updated', { detail: updated }));
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      // Get task details before deletion for the event
      const taskToDelete = tasks.find(t => t.schema.id === id);
      await window.electronAPI.deleteTask(id);
      setTasks(prev => prev.filter(t => t.schema.id !== id));
      // Emit event for desktop assistant
      if (taskToDelete) {
        window.dispatchEvent(new CustomEvent('task:deleted', { detail: taskToDelete }));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleAvatarChange = async (avatar: string) => {
    const newSettings = { ...settings, selectedAvatar: avatar };
    setSettings(newSettings);
    window.electronAPI.setSetting('selectedAvatar', avatar);
    
    // If it's a custom avatar, get the file path
    if (avatar.startsWith('custom_')) {
      const customAvatars = await window.electronAPI.getSetting('customAvatars');
      if (customAvatars && Array.isArray(customAvatars)) {
        const customAvatar = customAvatars.find(a => a.name === avatar);
        if (customAvatar) {
          window.electronAPI.setSetting('customAvatarPath', customAvatar.filePath);
        }
      }
    }
    
    window.electronAPI.changeAvatar(avatar);
  };

  const handleCloseApp = () => {
    window.electronAPI.closeWindow();
  };

  const handleForceQuit = () => {
    window.electronAPI.forceQuit();
  };

  const handleMinimizeApp = () => {
    window.electronAPI.minimizeWindow();
  };

  // Import tasks handler: delegate to main via a unified IPC
  const handleImportTasks = async () => {
    try {
      const filePath = await window.electronAPI.invoke('select-import-file');
      if (!filePath) return;
      const created = await window.electronAPI.invoke('task:import', { filePath });
      if (Array.isArray(created) && created.length) {
        await loadTasks();
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  const tabs = [
    { id: 'applications', label: 'Applications', icon: CheckSquare },
    { id: 'avatar', label: 'Avatar', icon: Smile },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex flex-col h-screen font-sans antialiased dark">
      <div className="flex flex-col w-full overflow-hidden bg-background text-foreground">
        {/* Header with Tabs */}
        <header className="flex-shrink-0 bg-background border-b-0 header sticky top-0 z-50" style={{WebkitAppRegion: 'drag'}}>
          <div className="flex flex-col">
            {/* Window Controls */}
             <div className="flex justify-end items-center h-7 pr-0">
              <div className="flex items-center" style={{WebkitAppRegion: 'no-drag'}}>
                <button
                  onClick={handleMinimizeApp}
                   aria-label="Minimize window"
                   className="flex items-center justify-center w-12 h-7 hover:bg-gray-600 hover:text-white transition-all duration-200 border-none outline-none"
                  title="Minimize"
                >
                  <Minus size={14} className="text-muted-foreground hover:text-white" />
                </button>
                <button
                  onClick={handleCloseApp}
                  onDoubleClick={handleForceQuit}
                   aria-label="Close window"
                   className="flex items-center justify-center w-12 h-7 hover:bg-red-600 hover:text-white transition-all duration-200 border-none outline-none"
                  title="Close (Double-click to quit app completely)"
                >
                  <span className="text-muted-foreground hover:text-white text-sm font-bold">✕</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Date and Time Header */}
        <LocationDateTime 
          timeFormat={settings.timeFormat || '24h'}
          timezone={settings.timezone}
        />
        
        {/* Navigation Header */}
        <header className="flex-shrink-0 bg-background border-b-0 header sticky top-0 z-50" style={{WebkitAppRegion: 'drag'}}>
          <div className="flex flex-col">
            {/* Navigation Tabs */}
            <div className="flex justify-center items-center h-12 px-6">
              <nav className="flex items-center gap-2 top-nav" style={{WebkitAppRegion: 'no-drag'}}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'applications') setActiveAppView('home');
                    }}
                    className={`group flex items-center px-4 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 top-nav-btn ${
                      activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-md active'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 hover:scale-102'
                    }`}
                  >
                    <tab.icon size={14} className={`mr-2 transition-transform duration-200 ${
                      activeTab === tab.id ? 'scale-100' : 'group-hover:scale-105'
                    }`} />
                    <span className="font-medium">{tab.id === 'applications' && activeAppView !== 'home' ? '← Back' : tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        className="ml-2 w-1 h-1 rounded-full bg-gray-900"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
              
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background no-scrollbar">
          <div className="h-full p-8 pb-0 min-h-0">
            <AnimatePresence mode="wait">
              {activeTab === 'applications' && (
                <motion.div
                  key="applications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <ApplicationsTab
                    reminders={reminders}
                    onAddReminder={handleAddReminder}
                    onRemoveReminder={handleRemoveReminder}
                    onEditReminder={handleEditReminder}
                    onToggleReminder={handleToggleReminder}
                    timeFormat={settings.timeFormat || '24h'}
                    tasks={tasks}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    settings={settings as AppSettings}
                    remindersContent={(
                      <RemindersTab 
                        reminders={reminders}
                        onAddReminder={handleAddReminder}
                        onRemoveReminder={handleRemoveReminder}
                        onEditReminder={handleEditReminder}
                        onToggleReminder={handleToggleReminder}
                        timeFormat={settings.timeFormat || '24h'}
                      />
                    )}
                    activeApp={activeAppView}
                      onActiveAppChange={setActiveAppView}
                      onSettingChange={handleSettingChange}
                  />
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <SettingsTab 
                    settings={settings as AppSettings}
                    onSettingChange={handleSettingChange}
                    onTestNotification={handleTestNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'avatar' && (
                <motion.div
                  key="avatar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <AvatarTab 
                    selectedAvatar={settings.selectedAvatar || 'Tasky'}
                    onAvatarChange={handleAvatarChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
