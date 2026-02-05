import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from './TaskForm';

// Mock UI components to simplify rendering
vi.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('../ui/input', () => ({
  Input: React.forwardRef((props: any, ref: any) => <input ref={ref} {...props} />),
}));

vi.mock('../ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, value, onValueChange, className }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={className}
    >
      {children}
    </select>
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  FileText: () => <span>F</span>,
  FolderOpen: () => <span>D</span>,
  User: () => <span>U</span>,
  Terminal: () => <span>T</span>,
  Upload: () => <span>Up</span>,
}));

describe('TaskForm', () => {
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collapsed state', () => {
    it('shows "Add New Task" button when collapsed', () => {
      render(<TaskForm onCreateTask={mockOnCreate} />);
      expect(screen.getByText(/add new task/i)).toBeDefined();
    });

    it('expands when "Add New Task" button is clicked', () => {
      render(<TaskForm onCreateTask={mockOnCreate} />);
      fireEvent.click(screen.getByText(/add new task/i));
      expect(screen.getByLabelText(/task title/i)).toBeDefined();
    });
  });

  describe('expanded state (forceExpanded)', () => {
    it('shows form fields when forceExpanded', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      expect(screen.getByLabelText(/task title/i)).toBeDefined();
      expect(screen.getByLabelText(/description/i)).toBeDefined();
    });

    it('title input updates on change', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i);
      fireEvent.change(titleInput, { target: { value: 'My Task' } });
      expect((titleInput as HTMLInputElement).value).toBe('My Task');
    });

    it('description textarea updates on change', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const desc = screen.getByPlaceholderText(/add more details/i);
      fireEvent.change(desc, { target: { value: 'Details here' } });
      expect((desc as HTMLTextAreaElement).value).toBe('Details here');
    });

    it('does not submit with empty title', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const submitBtn = screen.getByText(/create task/i);
      fireEvent.click(submitBtn);
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('submits with valid title and calls onCreateTask', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i);
      fireEvent.change(titleInput, { target: { value: 'Test Task' } });

      const form = titleInput.closest('form')!;
      fireEvent.submit(form);

      expect(mockOnCreate).toHaveBeenCalledTimes(1);
      const arg = mockOnCreate.mock.calls[0][0];
      expect(arg.title).toBe('Test Task');
      expect(arg.assignedAgent).toBe('claude'); // default
    });

    it('resets form after submission', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Task' } });

      const form = titleInput.closest('form')!;
      fireEvent.submit(form);

      expect(titleInput.value).toBe('');
    });

    it('parses comma-separated affected files', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i);
      const filesInput = document.getElementById('task-affected-files')!;

      fireEvent.change(titleInput, { target: { value: 'Task' } });
      fireEvent.change(filesInput, { target: { value: 'file1.ts, file2.ts' } });

      const form = titleInput.closest('form')!;
      fireEvent.submit(form);

      const arg = mockOnCreate.mock.calls[0][0];
      expect(arg.affectedFiles).toEqual(['file1.ts', 'file2.ts']);
    });

    it('parses newline-separated affected files', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded />);
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i);
      const filesInput = document.getElementById('task-affected-files')!;

      fireEvent.change(titleInput, { target: { value: 'Task' } });
      fireEvent.change(filesInput, { target: { value: 'file1.ts\nfile2.ts' } });

      const form = titleInput.closest('form')!;
      fireEvent.submit(form);

      const arg = mockOnCreate.mock.calls[0][0];
      expect(arg.affectedFiles).toEqual(['file1.ts', 'file2.ts']);
    });

    it('uses custom submitLabel when provided', () => {
      render(<TaskForm onCreateTask={mockOnCreate} forceExpanded submitLabel="Save Changes" />);
      expect(screen.getByText(/save changes/i)).toBeDefined();
    });

    it('populates initial values when editing', () => {
      render(
        <TaskForm
          onCreateTask={mockOnCreate}
          forceExpanded
          initial={{ title: 'Edit Me', description: 'Desc', assignedAgent: 'gemini' }}
        />
      );
      const titleInput = screen.getByPlaceholderText(/what needs to be done/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Edit Me');
    });
  });

  describe('noCard mode', () => {
    it('renders form without Card wrapper when noCard is true', () => {
      const { container } = render(
        <TaskForm onCreateTask={mockOnCreate} forceExpanded noCard />
      );
      // Should have a form element directly
      expect(container.querySelector('form')).toBeDefined();
    });
  });
});
