import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatComposer } from './ChatComposer';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock McpToolsHelper since it's not part of ChatComposer's core behavior
vi.mock('./McpToolsHelper', () => ({
  McpToolsHelper: () => null,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  Square: () => <span data-testid="stop-icon">Stop</span>,
  Wrench: () => <span data-testid="wrench-icon">Wrench</span>,
}));

describe('ChatComposer', () => {
  const defaultProps = {
    input: '',
    setInput: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    busy: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea with placeholder', () => {
    render(<ChatComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/ask tasky/i)).toBeDefined();
  });

  it('displays current input value', () => {
    render(<ChatComposer {...defaultProps} input="Hello" />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hello');
  });

  it('calls setInput on typing', () => {
    const setInput = vi.fn();
    render(<ChatComposer {...defaultProps} setInput={setInput} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i);
    fireEvent.change(textarea, { target: { value: 'new text' } });
    expect(setInput).toHaveBeenCalledWith('new text');
  });

  it('calls onSend on Enter when input is non-empty', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} input="Hello" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does not call onSend on Enter when input is empty', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} input="" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend on Shift+Enter (allows newline)', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} input="Hello" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatComposer {...defaultProps} input="" />);
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toHaveProperty('disabled', true);
  });

  it('send button is enabled when input has content', () => {
    render(<ChatComposer {...defaultProps} input="Hello" />);
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toHaveProperty('disabled', false);
  });

  it('shows stop button when busy', () => {
    render(<ChatComposer {...defaultProps} busy={true} />);
    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeDefined();
  });

  it('calls onStop when stop button is clicked', () => {
    const onStop = vi.fn();
    render(<ChatComposer {...defaultProps} busy={true} onStop={onStop} />);
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not call onSend when busy', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} input="Hello" busy={true} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('textarea is disabled when disabled prop is true', () => {
    render(<ChatComposer {...defaultProps} disabled={true} />);
    const textarea = screen.getByPlaceholderText(/ask tasky/i) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('shows thinking indicator when busy', () => {
    render(<ChatComposer {...defaultProps} busy={true} />);
    expect(screen.getByText(/thinking/i)).toBeDefined();
  });
});
