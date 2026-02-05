import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Bell, BellOff, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { ToolEvent } from './types';

interface ToolEventTimelineProps {
  events: ToolEvent[];
  loadingTools: Set<string>;
}

export const ToolEventTimeline: React.FC<ToolEventTimelineProps> = ({ events, loadingTools }) => {
  if (events.length === 0) return null;

  // Helper to extract JSON from output
  const extractJsonFromOutput = (raw: string | undefined | null): any | null => {
    if (!raw || typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch {}
    
    const firstBrace = raw.indexOf('{');
    const firstBracket = raw.indexOf('[');
    let idx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) idx = Math.min(firstBrace, firstBracket);
    else idx = firstBrace !== -1 ? firstBrace : firstBracket;
    
    if (idx !== -1) {
      const sub = raw.slice(idx).trim();
      try { return JSON.parse(sub); } catch {}
    }
    
    const lines = raw.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const t = lines[i].trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        try { return JSON.parse(t); } catch {}
      }
    }
    return null;
  };

  return (
    <div className="space-y-3 mt-3">
      {events.map(ev => {
        const isLoading = loadingTools.has(ev.id);
        const nameLower = String(ev.name || '').toLowerCase();
        
        return (
          <motion.div
            key={ev.id}
            className="bg-card rounded-xl border border-border/30 p-4 shadow-sm hover:shadow-md transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ev.phase === 'done' ? 'bg-primary/10 text-primary' :
                ev.phase === 'error' ? 'bg-destructive/10 text-destructive' :
                'bg-muted text-foreground'
              }`}>
                {isLoading ? (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : ev.phase === 'done' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : ev.phase === 'error' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>

              {/* Tool Info */}
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {ev.name.replace('tasky_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isLoading && 'Executing...'}
                  {ev.phase === 'done' && 'Completed successfully'}
                  {ev.phase === 'error' && `Error: ${ev.error}`}
                  {!isLoading && ev.phase !== 'done' && ev.phase !== 'error' && 'Ready'}
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                ev.phase === 'done' ? 'bg-primary/10 text-primary' :
                ev.phase === 'error' ? 'bg-destructive/10 text-destructive' :
                'bg-muted text-foreground'
              }`}>
                {ev.phase}
              </div>
            </div>

            {/* Render output for completed tools */}
            {ev.output && ev.phase === 'done' && (() => {
              const parsed = extractJsonFromOutput(ev.output);
              
              // Render list_reminders output
              if (nameLower.includes('list_reminders') && Array.isArray(parsed)) {
                return (
                  <div className="mt-3 space-y-2">
                    {parsed.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No reminders found</div>
                    ) : (
                      parsed.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/20">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-foreground">{String(r.message || 'Reminder')}</div>
                            <button
                              className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 transition-colors ${
                                r.enabled 
                                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' 
                                  : 'bg-muted text-muted-foreground border-border/30 hover:bg-muted/80'
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  if (window.electronAPI.updateReminder) { window.electronAPI.updateReminder(r.id, { enabled: !r.enabled }); }
                                } catch {}
                              }}
                              title={r.enabled ? 'Disable reminder' : 'Enable reminder'}
                            >
                              {r.enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                              {r.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>
                          {r.time && (
                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              {String(r.time)}
                            </div>
                          )}
                          {Array.isArray(r.days) && r.days.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1 items-center">
                              <Calendar className="h-3 w-3 text-primary" />
                              {r.days.map((d: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              }

              // Render list_tasks output
              if (nameLower.includes('list_tasks') && Array.isArray(parsed)) {
                return (
                  <div className="mt-3 space-y-2">
                    {parsed.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No tasks found</div>
                    ) : (
                      parsed.map((t: any, idx: number) => {
                        const taskTitle = t?.schema?.title || t?.title || 'Task';
                        const taskStatus = t?.status || 'PENDING';
                        const taskDueDate = t?.schema?.dueDate || t?.dueDate;
                        const taskTags = t?.schema?.tags || t?.tags;
                        
                        return (
                          <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/20">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-foreground">{String(taskTitle)}</div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                taskStatus === 'COMPLETED' 
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : taskStatus === 'IN_PROGRESS'
                                  ? 'bg-accent text-accent-foreground border-accent'
                                  : 'bg-muted text-muted-foreground border-border/30'
                              }`}>
                                {String(taskStatus).replace('_', ' ')}
                              </span>
                            </div>
                            {taskDueDate && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-primary" />
                                Due: {new Date(taskDueDate).toLocaleString()}
                              </div>
                            )}
                            {Array.isArray(taskTags) && taskTags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {taskTags.map((tag: string, i: number) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/30">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              }

              // Fallback to raw output
              return (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/20">
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {ev.output}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        );
      })}
    </div>
  );
};
