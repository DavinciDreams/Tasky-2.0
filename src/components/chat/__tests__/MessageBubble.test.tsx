import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import type { ChatMessage } from '../types'

describe('MessageBubble', () => {
  it('renders user message with correct styling', () => {
    const message: ChatMessage = { role: 'user', content: 'Hello Tasky' }
    const { container } = render(<MessageBubble message={message} index={0} />)
    
    const bubble = container.querySelector('.bg-primary\\/10')
    expect(bubble).toBeTruthy()
    expect(bubble?.textContent).toBe('Hello Tasky')
  })

  it('renders assistant message with correct styling', () => {
    const message: ChatMessage = { role: 'assistant', content: 'Hello! How can I help?' }
    const { container } = render(<MessageBubble message={message} index={0} />)
    
    const bubble = container.querySelector('.bg-card')
    expect(bubble).toBeTruthy()
    expect(bubble?.textContent).toBe('Hello! How can I help?')
  })

  it('does not render adaptive card messages', () => {
    const message: ChatMessage = {
      role: 'assistant',
      content: JSON.stringify({ __taskyCard: { kind: 'confirm', name: 'test' } })
    }
    const { container } = render(<MessageBubble message={message} index={0} />)
    
    expect(container.firstChild).toBeNull()
  })

  it('handles malformed JSON gracefully', () => {
    const message: ChatMessage = { role: 'user', content: '{ invalid json' }
    const { container } = render(<MessageBubble message={message} index={0} />)
    
    const bubble = container.querySelector('.bg-primary\\/10')
    expect(bubble).toBeTruthy()
    expect(bubble?.textContent).toBe('{ invalid json')
  })
})
