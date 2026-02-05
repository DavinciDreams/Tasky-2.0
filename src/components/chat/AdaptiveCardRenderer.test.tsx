import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdaptiveCardRenderer } from './AdaptiveCardRenderer';

// Mock the heavy dependencies that aren't relevant to card rendering logic
vi.mock('@/components/ai-elements', () => ({
  Tool: ({ children, defaultOpen }: any) => <div data-testid="tool">{children}</div>,
  ToolHeader: ({ type, state }: any) => <div data-testid="tool-header" data-type={type} data-state={state} />,
  ToolContent: ({ children }: any) => <div data-testid="tool-content">{children}</div>,
  ToolOutput: ({ output }: any) => <pre data-testid="tool-output">{output}</pre>,
}));

vi.mock('./TaskDisplay', () => ({
  TaskDisplay: ({ tasks }: any) => (
    <div data-testid="task-display">
      {tasks.map((t: any, i: number) => (
        <div key={i} data-testid="task-item">{t.title || t.schema?.title || 'task'}</div>
      ))}
    </div>
  ),
  ReminderDisplay: ({ reminders }: any) => (
    <div data-testid="reminder-display">
      {reminders.map((r: any, i: number) => (
        <div key={i} data-testid="reminder-item">{r.message || 'reminder'}</div>
      ))}
    </div>
  ),
}));

vi.mock('./InlineConfirmation', () => ({
  InlineConfirmation: () => <div data-testid="inline-confirmation" />,
}));

describe('AdaptiveCardRenderer', () => {
  it('returns null for unknown kind', () => {
    const { container } = render(
      <AdaptiveCardRenderer card={{ kind: 'unknown' as any, name: 'test' }} />
    );
    expect(container.innerHTML).toBe('');
  });

  describe('kind="confirm"', () => {
    it('renders a confirmation card', () => {
      render(
        <AdaptiveCardRenderer card={{ kind: 'confirm', name: 'delete_task', args: {} }} />
      );
      expect(screen.getByText(/has been processed/i)).toBeDefined();
    });
  });

  describe('kind="result" - list_tasks', () => {
    it('renders TaskDisplay for list_tasks with array output', () => {
      const tasks = [{ title: 'Task A' }, { title: 'Task B' }];
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'list_tasks', output: JSON.stringify(tasks) }}
        />
      );
      expect(screen.getByTestId('task-display')).toBeDefined();
      expect(screen.getAllByTestId('task-item')).toHaveLength(2);
    });
  });

  describe('kind="result" - create_task', () => {
    it('renders TaskDisplay for create_task with object output', () => {
      const task = { title: 'New Task' };
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'create_task', output: JSON.stringify(task) }}
        />
      );
      expect(screen.getByTestId('task-display')).toBeDefined();
    });
  });

  describe('kind="result" - list_reminders', () => {
    it('renders ReminderDisplay for list_reminders with array output', () => {
      const reminders = [{ message: 'Reminder 1' }];
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'list_reminders', output: JSON.stringify(reminders) }}
        />
      );
      expect(screen.getByTestId('reminder-display')).toBeDefined();
    });
  });

  describe('kind="result" - delete_task', () => {
    it('renders success card for delete_task', () => {
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'delete_task', output: JSON.stringify({ title: 'Deleted' }) }}
        />
      );
      expect(screen.getByText(/deleted successfully/i)).toBeDefined();
    });

    it('renders failure card when output contains "not found"', () => {
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'delete_task', output: 'Task not found' }}
        />
      );
      expect(screen.getByText(/not found/i)).toBeDefined();
    });
  });

  describe('kind="result" - delete_reminder', () => {
    it('renders success card for delete_reminder', () => {
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'delete_reminder', output: '{}' }}
        />
      );
      expect(screen.getByText(/deleted successfully/i)).toBeDefined();
    });
  });

  describe('kind="result" - execute_task', () => {
    it('renders execution card with task details', () => {
      const output = JSON.stringify({ title: 'Build feature', newStatus: 'IN_PROGRESS' });
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'execute_task', output }}
        />
      );
      expect(screen.getByText(/execution started/i)).toBeDefined();
      expect(screen.getByText(/Build feature/)).toBeDefined();
    });
  });

  describe('kind="result" - update_task', () => {
    it('renders TaskDisplay for update_task', () => {
      const task = { title: 'Updated Task' };
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'update_task', output: JSON.stringify(task) }}
        />
      );
      expect(screen.getByTestId('task-display')).toBeDefined();
    });
  });

  describe('kind="result" - default fallback', () => {
    it('renders ToolOutput for unknown tool names', () => {
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'some_other_tool', output: 'raw output' }}
        />
      );
      expect(screen.getByTestId('tool-output')).toBeDefined();
    });
  });

  describe('JSON extraction', () => {
    it('handles output with leading text before JSON', () => {
      const output = 'Some prefix text\n{"title": "Extracted"}';
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'create_task', output }}
        />
      );
      expect(screen.getByTestId('task-display')).toBeDefined();
    });

    it('handles null output gracefully', () => {
      render(
        <AdaptiveCardRenderer
          card={{ kind: 'result', name: 'some_tool', output: null as any }}
        />
      );
      // Should render fallback ToolOutput
      expect(screen.getByTestId('tool-output')).toBeDefined();
    });
  });
});
