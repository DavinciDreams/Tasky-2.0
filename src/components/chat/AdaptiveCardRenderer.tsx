import React from 'react';
import { Tool, ToolHeader, ToolContent, ToolOutput } from '@/components/ai-elements';
import { TaskDisplay, ReminderDisplay } from './TaskDisplay';
import { InlineConfirmation } from './InlineConfirmation';
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
    // For stored confirmations, show a simple completed state
    return (
      <Tool defaultOpen={true}>
        <ToolHeader type={`tool-${name}`} state="output-available" />
        <ToolContent>
          <div className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Confirmation: {String(name)}
            </div>
            <div className="text-sm text-foreground opacity-70">
              This confirmation has been processed.
            </div>
          </div>
        </ToolContent>
      </Tool>
    );
  }

  if (kind === 'result') {
    const nameLower = String(name || '').toLowerCase();
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const parsedOut = extractJsonFromOutput(outputStr);

    // Render list_reminders results using ReminderDisplay
    if (nameLower.includes('list_reminders') && Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-list_reminders" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <ReminderDisplay reminders={parsedOut} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render list_tasks results using TaskDisplay
    if (nameLower.includes('list_tasks') && Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-list_tasks" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <TaskDisplay tasks={parsedOut} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render create_task results using TaskDisplay (single task)
    if (nameLower.includes('create_task') && parsedOut && typeof parsedOut === 'object' && !Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-create_task" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <TaskDisplay tasks={[parsedOut]} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render update_task results using TaskDisplay (single task)
    if (nameLower.includes('update_task') && parsedOut && typeof parsedOut === 'object' && !Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-update_task" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <TaskDisplay tasks={[parsedOut]} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render create_reminder results using ReminderDisplay (single reminder)
    if (nameLower.includes('create_reminder') && parsedOut && typeof parsedOut === 'object' && !Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-create_reminder" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <ReminderDisplay reminders={[parsedOut]} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render update_reminder results using ReminderDisplay (single reminder)
    if (nameLower.includes('update_reminder') && parsedOut && typeof parsedOut === 'object' && !Array.isArray(parsedOut)) {
      return (
        <Tool defaultOpen={true}>
          <ToolHeader type="tool-update_reminder" state="output-available" />
          <ToolContent>
            <div className="p-3">
              <ReminderDisplay reminders={[parsedOut]} />
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Render delete operations with a compact success card. Prefer title over id.
    if (nameLower.includes('delete_task') || nameLower.includes('delete_reminder')) {
      const entity = nameLower.includes('delete_task') ? 'Task' : 'Reminder';
      // Try to parse Tasky structured card format
      let deletedTitle: string | undefined;
      let deletedId: string | undefined;
      if (parsedOut && typeof parsedOut === 'object') {
        // Direct card or wrapped under __taskyCard
        const card = (parsedOut as any)?.__taskyCard ? (parsedOut as any).__taskyCard : parsedOut;
        const data = (card as any)?.data || (card as any);
        deletedTitle = data?.title;
        deletedId = data?.id;
      }

      return (
        <Tool defaultOpen={true}>
          <ToolHeader type={`tool-${nameLower.includes('delete_task') ? 'delete_task' : 'delete_reminder'}`} state="output-available" />
          <ToolContent>
            <div className="p-3">
              <div className="text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg p-3">
                {entity} deleted successfully{deletedTitle ? `: ${deletedTitle}` : ''}
                {!deletedTitle && deletedId ? ` (ID: ${deletedId})` : ''}
              </div>
            </div>
          </ToolContent>
        </Tool>
      );
    }

    // Default result display for other tools
    return (
      <Tool defaultOpen={true}>
        <ToolHeader type={`tool-${name}`} state="output-available" />
        <ToolContent>
          <ToolOutput 
            output={typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
          />
        </ToolContent>
      </Tool>
    );
  }

  return null;
};
