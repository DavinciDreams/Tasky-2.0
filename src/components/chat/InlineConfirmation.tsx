import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Bell, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface InlineConfirmationProps {
  id: string;
  name: string;
  args?: any;
  onConfirm: (accepted: boolean) => void;
  disabled?: boolean;
}

export const InlineConfirmation: React.FC<InlineConfirmationProps> = ({
  id,
  name,
  args,
  onConfirm,
  disabled = false
}) => {
  const [timeFormat, setTimeFormat] = React.useState<'12h' | '24h'>('12h');
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tf = await (window as any)?.electronAPI?.getSetting?.('timeFormat');
        if (!mounted) return;
        const mapped = tf === '24' || tf === '24h' || tf === true
          ? '24h'
          : tf === '12' || tf === '12h' || tf === false
            ? '12h'
            : String(tf || '').toLowerCase().includes('24')
              ? '24h'
              : '12h';
        setTimeFormat(mapped);
      } catch {}
    })();
    const onUpdate = (_: any, payload?: { key: string; value: any }) => {
      try {
        if (!payload) return;
        if (payload.key === 'timeFormat') {
          const v = payload.value;
          const mapped = v === '24' || v === '24h' || v === true
            ? '24h'
            : v === '12' || v === '12h' || v === false
              ? '12h'
              : String(v || '').toLowerCase().includes('24')
                ? '24h'
                : '12h';
          setTimeFormat(mapped);
        }
      } catch {}
    };
    try { (window as any)?.electronAPI?.onSettingsUpdate?.(onUpdate); } catch {}
    return () => { mounted = false; };
  }, []);

  const nameLower = String(name || '').toLowerCase();
  const isDelete = nameLower.includes('delete');
  const isTask = nameLower.includes('task');
  const isReminder = nameLower.includes('reminder');

  const formatTimeString = (time: string) => {
    if (timeFormat === '24h') return time;
    const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return time;
    let h = parseInt(m[1], 10);
    const mm = m[2];
    let suffix = 'AM';
    if (h === 0) { h = 12; suffix = 'AM'; }
    else if (h === 12) { suffix = 'PM'; }
    else if (h > 12) { h = h - 12; suffix = 'PM'; }
    return `${h}:${mm} ${suffix}`;
  };

  const getIcon = () => {
    if (isDelete) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (isReminder) return <Bell className="h-4 w-4 text-orange-500" />;
    if (isTask) return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <CheckCircle className="h-4 w-4 text-primary" />;
  };

  const getActionTitle = () => {
    if (nameLower.includes('create')) return 'Create';
    if (nameLower.includes('update')) return 'Update';
    if (nameLower.includes('delete')) return 'Delete';
    if (nameLower.includes('execute')) return 'Execute';
    return 'Confirm';
  };

  const getEntityType = () => {
    if (isTask) return 'Task';
    if (isReminder) return 'Reminder';
    return 'Action';
  };

  const renderContent = () => {
    if (isDelete) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <div>
              <div className="font-medium text-destructive">Delete {getEntityType()}</div>
              <div className="text-xs text-muted-foreground">This action cannot be undone</div>
            </div>
          </div>
          {args?.title && (
            <div className="text-sm text-foreground pl-2">
              <strong>Title:</strong> {String(args.title)}
            </div>
          )}
          {args?.id && (
            <div className="text-xs text-muted-foreground pl-2">
              ID: {String(args.id)}
            </div>
          )}
        </div>
      );
    }

    if (isReminder) {
      const title = args?.title || args?.message || 'Reminder';
      const timeVal = args?.time?.relative ?? args?.time ?? null;
      const days = Array.isArray(args?.days) && args.days.length > 0 ? args.days : null;
      const oneTime = !!args?.oneTime;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <span className="font-medium text-foreground">{String(title)}</span>
          </div>
          {timeVal && (
            <div className="flex items-center gap-2 pl-6">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {typeof timeVal === 'string' ? formatTimeString(timeVal) : JSON.stringify(timeVal)}
              </span>
            </div>
          )}
          {days && (
            <div className="flex items-center gap-2 pl-6">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-foreground">{days.join(', ')}</span>
            </div>
          )}
          {oneTime && (
            <div className="flex items-center gap-2 pl-6 text-accent">
              <span className="text-xs">One-time reminder</span>
            </div>
          )}
        </div>
      );
    }

    if (isTask) {
      const title = args?.title;
      const description = args?.description;
      const dueDate = args?.dueDate;
      const tags = Array.isArray(args?.tags) ? args.tags : null;
      const status = args?.status;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-foreground">
              {title ? String(title) : 'Task'}
            </span>
          </div>
          {description && (
            <div className="pl-6 text-sm text-muted-foreground">
              {String(description)}
            </div>
          )}
          {status && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-sm text-foreground capitalize">{String(status)}</span>
            </div>
          )}
          {dueDate && (
            <div className="flex items-center gap-2 pl-6">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-foreground">{String(dueDate)}</span>
            </div>
          )}
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-xs text-muted-foreground">Tags:</span>
              <div className="flex gap-1 flex-wrap">
                {tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded"
                  >
                    {String(tag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Generic content for other tool types
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-foreground">{name}</span>
        </div>
        {args && Object.keys(args).length > 0 && (
          <div className="pl-6 text-sm text-muted-foreground">
            <pre className="text-xs overflow-auto max-h-24 scrollbar-thin">{JSON.stringify(args, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-2xl p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {getIcon()}
        <span className="font-semibold text-sm text-foreground">
          {getActionTitle()} {getEntityType()}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Confirmation Required
        </span>
      </div>

      {/* Content */}
      <div className="mb-4">
        {renderContent()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onConfirm(false)}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <XCircle className="h-3 w-3" />
          Cancel
        </Button>
        <Button
          variant={isDelete ? "destructive" : "default"}
          size="sm"
          onClick={() => onConfirm(true)}
          disabled={disabled}
          className={`flex items-center gap-1 border ${isDelete ? 'border-destructive/50' : 'border-primary/50'}`}
        >
          <CheckCircle className="h-3 w-3" />
          {isDelete ? 'Delete' : 'Confirm'}
        </Button>
      </div>
    </motion.div>
  );
};
