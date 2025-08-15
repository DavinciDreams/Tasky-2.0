import React from 'react';
import { Clock, Calendar, Bell, BellOff } from 'lucide-react';
import type { AdaptiveCard } from './types';

interface AdaptiveCardRendererProps {
  card: AdaptiveCard;
}

export const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps> = ({ card }) => {
  const { kind, name, args, output } = card;
  
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

  if (kind === 'confirm') {
    return (
      <div className="bg-card border border-border/30 rounded-2xl px-4 py-3 w-full">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Confirm: {String(name)}
        </div>
        <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
    );
  }

  if (kind === 'result') {
    const nameLower = String(name || '').toLowerCase();
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const parsedOut = extractJsonFromOutput(outputStr);

    // Render list_reminders results
    if (nameLower.includes('list_reminders') && Array.isArray(parsedOut)) {
      return (
        <div className="space-y-2 w-full">
          {parsedOut.map((r: any, idx: number) => (
            <div key={idx} className="p-3 bg-card rounded-lg border border-border/30 hover:border-border/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="font-medium text-foreground">{String(r.message || 'Reminder')}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  r.enabled 
                    ? 'bg-primary/10 text-primary border-primary/30' 
                    : 'bg-muted text-muted-foreground border-border/30'
                }`}>
                  {r.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                {String(r.time || '')}
              </div>
              {Array.isArray(r.days) && r.days.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  <Calendar className="h-3 w-3 text-primary" />
                  {r.days.map((d: string, i2: number) => (
                    <span key={i2} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Render list_tasks results
    if (nameLower.includes('list_tasks') && Array.isArray(parsedOut)) {
      return (
        <div className="space-y-2 w-full">
          {parsedOut.map((t: any, idx: number) => {
            const taskTitle = t?.schema?.title || t?.title || 'Task';
            const taskStatus = t?.status || 'PENDING';
            const taskDueDate = t?.schema?.dueDate || t?.dueDate;
            const taskTags = t?.schema?.tags || t?.tags;
            
            return (
              <div key={idx} className="p-3 bg-card rounded-lg border border-border/30 hover:border-border/50 transition-colors">
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
          })}
        </div>
      );
    }

    // Fallback to raw output
    return (
      <div className="bg-card border border-border/30 rounded-2xl px-4 py-3 w-full">
        <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
          {outputStr}
        </pre>
      </div>
    );
  }

  return null;
};
