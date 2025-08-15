import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { AdaptiveCardRenderer } from '../AdaptiveCardRenderer'
import type { AdaptiveCard } from '../types'

describe('AdaptiveCardRenderer', () => {
  it('renders confirm card', () => {
    const card: AdaptiveCard = {
      kind: 'confirm',
      name: 'tasky_delete_task',
      args: { id: 'task_123' }
    }
    const { container, getByText } = render(<AdaptiveCardRenderer card={card} />)
    
    expect(getByText('Confirm: tasky_delete_task')).toBeTruthy()
    expect(container.textContent).toContain('task_123')
  })

  it('renders list_reminders result card', () => {
    const card: AdaptiveCard = {
      kind: 'result',
      name: 'tasky_list_reminders',
      output: JSON.stringify([
        { message: 'Team meeting', time: '10:00', days: ['monday', 'wednesday'], enabled: true },
        { message: 'Lunch break', time: '12:00', days: ['monday'], enabled: false }
      ])
    }
    const { getByText, container } = render(<AdaptiveCardRenderer card={card} />)
    
    expect(getByText('Team meeting')).toBeTruthy()
    expect(getByText('Lunch break')).toBeTruthy()
    expect(container.textContent).toContain('10:00')
    expect(container.textContent).toContain('monday')
  })

  it('renders list_tasks result card', () => {
    const card: AdaptiveCard = {
      kind: 'result',
      name: 'tasky_list_tasks',
      output: JSON.stringify([
        { 
          schema: { 
            title: 'Write tests',
            dueDate: '2024-01-15',
            tags: ['testing', 'urgent']
          },
          status: 'IN_PROGRESS'
        }
      ])
    }
    const { getByText, container } = render(<AdaptiveCardRenderer card={card} />)
    
    expect(getByText('Write tests')).toBeTruthy()
    expect(container.textContent).toContain('IN PROGRESS')
    expect(container.textContent).toContain('testing')
    expect(container.textContent).toContain('urgent')
  })

  it('renders fallback for unknown result types', () => {
    const card: AdaptiveCard = {
      kind: 'result',
      name: 'unknown_tool',
      output: 'Some output text'
    }
    const { container } = render(<AdaptiveCardRenderer card={card} />)
    
    expect(container.textContent).toContain('Some output text')
  })

  it('handles malformed JSON in output gracefully', () => {
    const card: AdaptiveCard = {
      kind: 'result',
      name: 'tasky_list_tasks',
      output: 'Not valid JSON'
    }
    const { container } = render(<AdaptiveCardRenderer card={card} />)
    
    // Should render as fallback
    expect(container.textContent).toContain('Not valid JSON')
  })
})
