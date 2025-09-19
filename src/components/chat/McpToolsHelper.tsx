import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Plus, 
  List, 
  Edit3, 
  Trash2, 
  Play, 
  Clock, 
  Bell,
  ChevronDown,
  Info,
  X
} from 'lucide-react';

interface McpTool {
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'tasks' | 'reminders';
  template: string;
  helpText: string;
  examples: string[];
}

const MCP_TOOLS: McpTool[] = [
  // Task Tools
  {
    name: 'tasky_create_task',
    description: 'Create a new task',
    icon: Plus,
    category: 'tasks',
    template: `Create a task: "{{title}}" with description "{{description}}" due {{dueDate}} with tags {{tags}} estimated duration {{estimatedDuration}} minutes assigned to {{assignedAgent}} with reminder {{reminderEnabled}} at {{reminderTime}}`,
    helpText: 'Creates a new task with title, description, due date, tags, estimated duration, dependencies, assigned agent, reminders, and execution path.',
    examples: [
      'Create a task: "Review project proposal" due tomorrow with tags "review, urgent" estimated duration 60 minutes',
      'Create a task: "Buy groceries" with description "milk, bread, eggs" due today with reminder true at 14:00',
      'Create a task: "Fix login bug" with tags "bug, authentication" assigned to claude estimated duration 120 minutes',
      'Create a task: "Prepare presentation" with description "Q3 results" due 2025-09-08T17:00:00Z with tags "work, presentation"',
      'Create a task: "Code review" with files "/src/auth.ts, /src/login.tsx" estimated duration 45 minutes assigned to gemini'
    ]
  },
  {
    name: 'tasky_list_tasks',
    description: 'List existing tasks',
    icon: List,
    category: 'tasks',
    template: `List tasks with status {{status}} tag {{tag}} search {{search}} limit {{limit}} dueDateFrom {{dueDateFrom}} dueDateTo {{dueDateTo}} offset {{offset}}`,
    helpText: 'Lists all tasks with optional filtering by status, tag, search terms, due date range, and pagination support.',
    examples: [
      'List all tasks',
      'List tasks with status "pending"',
      'List tasks with tag "bug"',
      'List tasks with search "login" limit 10',
      'List tasks dueDateFrom "2025-09-01" dueDateTo "2025-09-30"'
    ]
  },
  {
    name: 'tasky_update_task',
    description: 'Update an existing task',
    icon: Edit3,
    category: 'tasks',
    template: `Update task {{id}} with title "{{title}}" description "{{description}}" status {{status}} dueDate {{dueDate}} tags {{tags}} estimatedDuration {{estimatedDuration}} assignedAgent {{assignedAgent}} reminderEnabled {{reminderEnabled}} reminderTime {{reminderTime}}`,
    helpText: 'Updates an existing task with new properties, status changes, or metadata modifications. Supports partial updates - only specified fields are modified.',
    examples: [
      'Update task "task_123" with status "completed"',
      'Update task "task_456" with title "Fix critical bug" status "in_progress"',
      'Update task "task_789" with dueDate "2025-09-10T17:00:00Z" tags ["urgent", "bug"]',
      'Update task "task_abc" with assignedAgent "claude" estimatedDuration 120'
    ]
  },
  {
    name: 'tasky_delete_task',
    description: 'Delete a task',
    icon: Trash2,
    category: 'tasks',
    template: `Delete task {{id}}`,
    helpText: 'Permanently deletes a task by ID, removing all associated data including tags and references. This is a destructive operation that cannot be undone.',
    examples: [
      'Delete task "task_123"',
      'Delete task "old_project_456"',
      'Remove task "task_abc"'
    ]
  },
  {
    name: 'tasky_execute_task',
    description: 'Execute/start a task',
    icon: Play,
    category: 'tasks',
    template: `Execute task {{id}} or title {{title}} with status {{status}}`,
    helpText: 'Executes a task by updating status to IN_PROGRESS or COMPLETED, with integration to the main Tasky app. Prefer id; if not available, provide title or matchTitle — fuzzy matching resolves to the canonical ID.',
    examples: [
      'Execute task id "create_new_folder_20250914_164055_e6213ef4"',
      'Execute task title "Fix login bug"',
      'Execute task title "login bug" with status "IN_PROGRESS"',
      'Start task title "prepare presentation"'
    ]
  },
  // Reminder Tools
  {
    name: 'tasky_create_reminder',
    description: 'Create a new reminder',
    icon: Bell,
    category: 'reminders',
    template: `Create reminder "{{message}}" at {{time}} on {{days}} with enabled {{enabled}} and oneTime {{oneTime}}`,
    helpText: 'Creates a new recurring or one-time reminder with message, time, specific days of the week, enabled status, and one-time option. Supports relative times like "in 5 minutes".',
    examples: [
      'Create reminder "Stand-up meeting" at 09:00 on Monday, Wednesday, Friday with enabled true',
      'Create reminder "Take medication" at 20:00 on Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
      'Create reminder "Water plants" at 18:00 on Sunday with enabled true',
      'Create reminder "Take a break" at "in 25 minutes" on [] with oneTime true',
      'Create reminder "Check emails" at 09:00 on Monday, Tuesday, Wednesday, Thursday, Friday with enabled true and oneTime false'
    ]
  },
  {
    name: 'tasky_list_reminders',
    description: 'List existing reminders',
    icon: Clock,
    category: 'reminders',
    template: `List reminders with enabled {{enabled}}`,
    helpText: 'Lists all reminders with optional filtering by enabled status. Provides comprehensive reminder visibility with schedule details.',
    examples: [
      'List all reminders',
      'List reminders with enabled true',
      'List reminders with enabled false',
      'Show active reminders',
      'Show disabled reminders'
    ]
  },
  {
    name: 'tasky_update_reminder',
    description: 'Update a reminder',
    icon: Edit3,
    category: 'reminders',
    template: `Update reminder {{id}} with message "{{message}}" time {{time}} days {{days}} enabled {{enabled}}`,
    helpText: 'Updates an existing reminder with new message, time, schedule days, or enabled status. Supports partial updates - only specified fields are modified.',
    examples: [
      'Update reminder "reminder_123" with time "10:00"',
      'Update reminder "reminder_456" with enabled false',
      'Update reminder "reminder_789" with message "New reminder text" days ["monday", "friday"]',
      'Update reminder "reminder_abc" with time "14:30" enabled true'
    ]
  },
  {
    name: 'tasky_delete_reminder',
    description: 'Delete a reminder',
    icon: Trash2,
    category: 'reminders',
    template: `Delete reminder {{id}}`,
    helpText: 'Permanently deletes a reminder by ID, removing all associated schedule data and references. This is a destructive operation that cannot be undone.',
    examples: [
      'Delete reminder "reminder_123"',
      'Delete reminder "old_meeting_456"',
      'Remove reminder "reminder_abc"'
    ]
  }
];

interface McpToolsHelperProps {
  onInsertTemplate: (template: string) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export const McpToolsHelper: React.FC<McpToolsHelperProps> = ({
  onInsertTemplate,
  isOpen,
  onClose,
  triggerRef
}) => {
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'tasks' | 'reminders'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTools = activeCategory === 'all' 
    ? MCP_TOOLS 
    : MCP_TOOLS.filter(tool => tool.category === activeCategory);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleToolSelect = (tool: McpTool) => {
    onInsertTemplate(tool.template);
    onClose();
  };

  const handleShowDetails = (tool: McpTool, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTool(tool);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 right-0 mb-2 z-50"
        >
          <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden opacity-100" style={{ backgroundColor: 'hsl(var(--background))' }}>
            {/* Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">MCP Tools</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              
              {/* Category Filter */}
              <div className="flex gap-1 mt-2">
                {(['all', 'tasks', 'reminders'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      activeCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.name}
                    className="p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors"
                    onClick={() => handleToolSelect(tool)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className={`w-4 h-4 ${
                          tool.category === 'tasks' ? 'text-blue-500' : 'text-orange-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tool.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tool.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleShowDetails(tool, e)}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                      >
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredTools.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No tools found for this category
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Tool Details Modal */}
      <AnimatePresence>
        {selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedTool(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto opacity-100"
              style={{ backgroundColor: 'hsl(var(--background))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <selectedTool.icon className={`w-5 h-5 ${
                      selectedTool.category === 'tasks' ? 'text-blue-500' : 'text-orange-500'
                    }`} />
                    <h3 className="font-semibold text-foreground">
                      {selectedTool.description}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTool(null)}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-foreground mb-1">Tool Name</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                    {selectedTool.name}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-foreground mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTool.helpText}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-foreground mb-1">Template</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded block text-muted-foreground">
                    {selectedTool.template}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-foreground mb-2">Examples</h4>
                  <div className="space-y-1">
                    {selectedTool.examples.map((example, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {example}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      handleToolSelect(selectedTool);
                      setSelectedTool(null);
                    }}
                    className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => setSelectedTool(null)}
                    className="px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
