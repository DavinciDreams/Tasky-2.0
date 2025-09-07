import React from 'react';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements';
import type { ToolEvent } from './types';

interface ToolCallDisplayProps {
  toolEvent: ToolEvent;
  compact?: boolean;
}

type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

const mapEventPhaseToState = (phase: string): ToolState => {
  switch (phase) {
    case 'start':
      return 'input-available';
    case 'done':
      return 'output-available';
    case 'error':
      return 'output-error';
    default:
      return 'input-streaming';
  }
};

const formatToolOutput = (output: any): string => {
  if (!output) return '';
  
  try {
    // If it's a JSON-RPC response, extract the content
    if (output.content && Array.isArray(output.content)) {
      const textContent = output.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('\n');
      return textContent || JSON.stringify(output, null, 2);
    }
    
    // If it's a string, return as-is
    if (typeof output === 'string') {
      return output;
    }
    
    // Otherwise, stringify
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
};

const formatToolError = (toolEvent: ToolEvent): string => {
  if (toolEvent.error) {
    return typeof toolEvent.error === 'string' 
      ? toolEvent.error 
      : JSON.stringify(toolEvent.error, null, 2);
  }
  
  if (toolEvent.phase === 'error') {
    return 'Tool execution failed';
  }
  
  return 'An unknown error occurred';
};

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ 
  toolEvent, 
  compact = false 
}) => {
  const state = mapEventPhaseToState(toolEvent.phase);
  const toolType = `tool-${toolEvent.name}`;
  
  if (compact) {
    // For compact mode, show a simple badge
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-border bg-muted/10">
        <span className="font-mono">{toolEvent.name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="capitalize">{toolEvent.phase}</span>
      </div>
    );
  }

  return (
    <Tool className="my-2">
      <ToolHeader type={toolType} state={state} />
      <ToolContent>
        {toolEvent.args && <ToolInput input={toolEvent.args} />}
        {(toolEvent.output || toolEvent.error || toolEvent.phase === 'error') && (
          <ToolOutput
            output={toolEvent.output ? formatToolOutput(toolEvent.output) : undefined}
            errorText={toolEvent.error || toolEvent.phase === 'error' ? formatToolError(toolEvent) : undefined}
          />
        )}
      </ToolContent>
    </Tool>
  );
};
