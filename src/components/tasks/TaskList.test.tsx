import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from './TaskList';
import { TaskStatus, TaskyTask } from '../../types/task';

// Mock UI components
vi.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('../ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('./TaskForm', () => ({
  TaskForm: () => null,
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: any) => <span className={className}>CheckCircle</span>,
  Circle: ({ className }: any) => <span className={className}>Circle</span>,
  Edit2: ({ className }: any) => <span className={className}>Edit</span>,
  Trash2: ({ className }: any) => <span className={className}>Trash</span>,
  Play: ({ className }: any) => <span className={className}>Play</span>,
  Archive: ({ className }: any) => <span className={className}>Archive</span>,
  FileText: ({ className }: any) => <span className={className}>FileText</span>,
  FolderOpen: ({ className }: any) => <span className={className}>FolderOpen</span>,
  User: ({ className }: any) => <span className={className}>User</span>,
}));

// Helper to create a mock task
function mockTask(overrides?: Partial<TaskyTask> & { schema?: Partial<TaskyTask['schema']> }): TaskyTask {
  const now = new Date();
  return {
    status: TaskStatus.PENDING,
    metadata: { version: 1, createdBy: 'test', lastModified: now },
    ...overrides,
    schema: {
      id: 'task-1',
      title: 'Test Task',
      createdAt: now,
      updatedAt: now,
      tags: [],
      affectedFiles: [],
      dependencies: [],
      ...(overrides?.schema || {}),
    },
  } as TaskyTask;
}

describe('TaskList', () => {
  const defaultProps = {
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    timeFormat: '12h' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders empty state message when no tasks', () => {
      render(<TaskList {...defaultProps} tasks={[]} />);
      expect(screen.getByText(/no tasks found/i)).toBeDefined();
      expect(screen.getByText(/create your first task/i)).toBeDefined();
    });
  });

  describe('with tasks', () => {
    it('renders task titles', () => {
      const tasks = [
        mockTask({ schema: { id: 't1', title: 'First Task', createdAt: new Date() } }),
        mockTask({ schema: { id: 't2', title: 'Second Task', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('First Task')).toBeDefined();
      expect(screen.getByText('Second Task')).toBeDefined();
    });

    it('shows status badge for each task', () => {
      const tasks = [
        mockTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'Pending Task', createdAt: new Date() } }),
        mockTask({ status: TaskStatus.COMPLETED, schema: { id: 't2', title: 'Done Task', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('pending')).toBeDefined();
      expect(screen.getByText('completed')).toBeDefined();
    });

    it('checkbox is checked for completed tasks', () => {
      const tasks = [
        mockTask({ status: TaskStatus.COMPLETED, schema: { id: 't1', title: 'Done', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('checkbox is unchecked for pending tasks', () => {
      const tasks = [
        mockTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'Pending', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('calls onUpdateTask when checkbox is toggled to complete', () => {
      const onUpdate = vi.fn();
      const tasks = [
        mockTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'Toggle Me', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} onUpdateTask={onUpdate} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(onUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({
        status: TaskStatus.COMPLETED,
      }));
    });

    it('calls onUpdateTask when checkbox is toggled to pending', () => {
      const onUpdate = vi.fn();
      const tasks = [
        mockTask({ status: TaskStatus.COMPLETED, schema: { id: 't1', title: 'Uncomplete Me', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} onUpdateTask={onUpdate} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(onUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({
        status: TaskStatus.PENDING,
      }));
    });

    it('calls onDeleteTask when delete button is clicked', () => {
      const onDelete = vi.fn();
      const tasks = [
        mockTask({ schema: { id: 't1', title: 'Delete Me', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} onDeleteTask={onDelete} />);
      const deleteBtn = screen.getByTitle('Delete Task');
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith('t1');
    });

    it('applies line-through to completed task title', () => {
      const tasks = [
        mockTask({ status: TaskStatus.COMPLETED, schema: { id: 't1', title: 'Completed', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      const title = screen.getByText('Completed');
      expect(title.className).toContain('line-through');
    });

    it('does not apply line-through to pending task title', () => {
      const tasks = [
        mockTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'Open', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      const title = screen.getByText('Open');
      expect(title.className).not.toContain('line-through');
    });

    it('shows assigned agent badge when present', () => {
      const tasks = [
        mockTask({ schema: { id: 't1', title: 'Agent Task', assignedAgent: 'claude', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('claude')).toBeDefined();
    });

    it('shows execution path when present', () => {
      const tasks = [
        mockTask({ schema: { id: 't1', title: 'Path Task', executionPath: 'src/middleware', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('src/middleware')).toBeDefined();
    });

    it('shows affected files when present', () => {
      const tasks = [
        mockTask({ schema: { id: 't1', title: 'Files Task', affectedFiles: ['auth.ts', 'guard.ts'], createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('auth.ts')).toBeDefined();
      expect(screen.getByText('guard.ts')).toBeDefined();
    });

    it('displays in_progress status badge correctly', () => {
      const tasks = [
        mockTask({ status: TaskStatus.IN_PROGRESS, schema: { id: 't1', title: 'WIP', createdAt: new Date() } }),
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);
      expect(screen.getByText('in progress')).toBeDefined();
    });
  });
});
