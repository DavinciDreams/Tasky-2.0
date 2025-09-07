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
    template: `Create a task: "{{title}}" with description "{{description}}" due {{dueDate}}`,
    helpText: 'Creates a new task with title, description, and optional due date, tags, and other properties.',
    examples: [
      'Create a task: "Review project proposal" due tomorrow',
      'Create a task: "Buy groceries" with description "milk, bread, eggs" due today',
      'Create a task: "Prepare presentation" with tags "work, urgent"'
    ]
  },
  {
    name: 'tasky_list_tasks',
    description: 'List existing tasks',
    icon: List,
    category: 'tasks',
    template: `List all tasks with status {{status}}`,
    helpText: 'Lists all tasks with optional filtering by status, tags, due date, or search terms.',
    examples: [
      'List all tasks',
      'List tasks with status "pending"',
      'List tasks due today',
      'List tasks with tag "work"'
    ]
  },
  {
    name: 'tasky_update_task',
    description: 'Update an existing task',
    icon: Edit3,
    category: 'tasks',
    template: `Update task "{{title}}" to status {{status}}`,
    helpText: 'Updates an existing task\'s properties like status, title, description, or due date.',
    examples: [
      'Update task "Review project" to status "completed"',
      'Mark task "Buy groceries" as in progress',
      'Change task "Meeting prep" due date to tomorrow'
    ]
  },
  {
    name: 'tasky_delete_task',
    description: 'Delete a task',
    icon: Trash2,
    category: 'tasks',
    template: `Delete task "{{title}}"`,
    helpText: 'Permanently removes a task from the system.',
    examples: [
      'Delete task "Old project notes"',
      'Remove task "Outdated meeting"'
    ]
  },
  {
    name: 'tasky_execute_task',
    description: 'Execute/start a task',
    icon: Play,
    category: 'tasks',
    template: `Execute task "{{title}}"`,
    helpText: 'Marks a task as in progress or completed, depending on the current status.',
    examples: [
      'Execute task "Write report"',
      'Start task "Code review"',
      'Complete task "Send email"'
    ]
  },
  // Reminder Tools
  {
    name: 'tasky_create_reminder',
    description: 'Create a new reminder',
    icon: Bell,
    category: 'reminders',
    template: `Create reminder "{{message}}" at {{time}} on {{days}}`,
    helpText: 'Creates a new recurring reminder with message, time, and specific days of the week.',
    examples: [
      'Create reminder "Stand-up meeting" at 9:00 AM on Monday, Wednesday, Friday',
      'Create reminder "Take medication" at 8:00 PM daily',
      'Create reminder "Water plants" at 6:00 PM on Sunday'
    ]
  },
  {
    name: 'tasky_list_reminders',
    description: 'List existing reminders',
    icon: Clock,
    category: 'reminders',
    template: `List all reminders`,
    helpText: 'Lists all reminders with optional filtering by enabled status or day of the week.',
    examples: [
      'List all reminders',
      'List enabled reminders',
      'List reminders for Monday',
      'Show active reminders'
    ]
  },
  {
    name: 'tasky_update_reminder',
    description: 'Update a reminder',
    icon: Edit3,
    category: 'reminders',
    template: `Update reminder "{{message}}" to time {{time}}`,
    helpText: 'Updates an existing reminder\'s message, time, days, or enabled status.',
    examples: [
      'Update reminder "Meeting" to 10:00 AM',
      'Change reminder "Lunch" to Tuesday and Thursday',
      'Disable reminder "Old notification"'
    ]
  },
  {
    name: 'tasky_delete_reminder',
    description: 'Delete a reminder',
    icon: Trash2,
    category: 'reminders',
    template: `Delete reminder "{{message}}"`,
    helpText: 'Permanently removes a reminder from the system.',
    examples: [
      'Delete reminder "Old meeting"',
      'Remove reminder "Outdated notification"'
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
          <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden">
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
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedTool(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
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
