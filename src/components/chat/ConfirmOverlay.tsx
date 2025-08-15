import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Clock, Calendar, Bell, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import type { ConfirmState } from './types';

interface ConfirmOverlayProps {
  pendingConfirm: ConfirmState;
  onConfirm: (accepted: boolean) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

export const ConfirmOverlay: React.FC<ConfirmOverlayProps> = ({
  pendingConfirm,
  onConfirm,
  rootRef,
}) => {
  if (!pendingConfirm || !rootRef.current) return null;

  const { name, args } = pendingConfirm;
  const nameLower = String(name || '').toLowerCase();
  const isDelete = nameLower.includes('delete');

  return createPortal(
    <div className="absolute inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <motion.div
        className="
          relative bg-background text-foreground 
          rounded-2xl shadow-2xl 
          border border-border/30 
          p-4 w-[min(640px,96vw)] 
          max-h-[70vh] overflow-y-auto 
          pointer-events-auto
        "
        style={{backgroundColor: 'hsl(var(--background))', backdropFilter: 'none'}}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 rounded-xl p-3 border bg-background border-border/30" style={{backgroundColor: 'hsl(var(--background))'}}>
          <div className="flex items-center gap-2">
            {!isDelete && (
              <div className="w-8 h-8 rounded-md flex items-center justify-center font-semibold bg-primary/10 text-primary">
                {nameLower.includes('reminder') ? '🔔' : nameLower.includes('task') ? '📝' : '⚙️'}
              </div>
            )}
            {isDelete && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <h3 className="font-semibold text-sm">Confirm</h3>
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        </div>

        {/* Content preview */}
        <div className="bg-muted/50 rounded-xl p-3 mb-4 border border-border/30">
          <div className="text-xs space-y-2">
            {(() => {
              // Destructive actions
              if (isDelete) {
                return (
                  <div className="space-y-2">
                    <div className="rounded p-3 border border-destructive/30 bg-destructive/10 text-foreground">
                      <div className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        This action cannot be undone
                      </div>
                      {args?.id && (
                        <div className="text-xs mt-1 text-muted-foreground">
                          ID: {String(args.id)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Reminder create/update
              if (nameLower.includes('reminder')) {
                const title = args?.title || args?.message || 'Reminder';
                const timeVal = args?.time?.relative ?? args?.time ?? null;
                const days = Array.isArray(args?.days) && args.days.length > 0 ? args.days : null;
                const oneTime = !!args?.oneTime;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{String(title)}</span>
                      <span className="text-[11px] text-muted-foreground">Reminder</span>
                    </div>
                    {timeVal && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-xs text-foreground">
                          {typeof timeVal === 'string' ? timeVal : JSON.stringify(timeVal)}
                        </span>
                      </div>
                    )}
                    {days && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span className="text-xs text-foreground">{days.join(', ')}</span>
                      </div>
                    )}
                    {oneTime && (
                      <div className="flex items-center gap-2 text-accent">
                        <Bell className="h-3 w-3" />
                        <span className="text-[11px]">One-time</span>
                      </div>
                    )}
                  </div>
                );
              }

              // Task create/update
              if (nameLower.includes('task')) {
                const title = args?.title;
                const description = args?.description;
                const dueDate = args?.dueDate;
                const tags = Array.isArray(args?.tags) ? args.tags : null;
                const status = args?.status;
                const id = args?.id;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {title ? String(title) : 'Task'}
                      </span>
                    </div>
                    {description && (
                      <div className="flex items-start gap-2 text-xs text-foreground/90">
                        <span className="text-muted-foreground">Description:</span>
                        <span>{String(description)}</span>
                      </div>
                    )}
                    {dueDate && (
                      <div className="flex items-center gap-2 text-xs text-foreground/90">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>{String(dueDate)}</span>
                      </div>
                    )}
                    {tags && tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-primary">Tags:</span>
                        <div className="flex gap-1 flex-wrap">
                          {tags.map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/30"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {status && (
                      <div className="flex items-center gap-2 text-xs text-foreground/90">
                        <span>Status:</span>
                        <span className="capitalize">{String(status).replace('_', ' ')}</span>
                      </div>
                    )}
                    {id && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>ID:</span>
                        <span className="font-mono">{String(id)}</span>
                      </div>
                    )}
                  </div>
                );
              }

              // JSON fallback
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="font-medium text-foreground">Tool Arguments</span>
                  </div>
                  <div className="pl-7">
                    <pre className="text-xs bg-card border border-border/30 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                      {JSON.stringify(args, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            size="lg"
            className="
              flex-1 rounded-xl 
              transition-all duration-200 font-medium py-3 
              bg-white text-gray-900 hover:bg-gray-100 border border-gray-300
            "
            onClick={() => onConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className={`
              flex-1 rounded-xl shadow-lg hover:shadow-xl 
              transition-all duration-200 font-medium py-3 
              ${isDelete 
                ? 'bg-destructive/90 text-destructive-foreground hover:bg-destructive' 
                : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }
            `}
            onClick={() => onConfirm(true)}
          >
            Confirm
          </Button>
        </div>
      </motion.div>
    </div>,
    rootRef.current
  );
};
