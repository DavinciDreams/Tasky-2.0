import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { ChatToasts } from '../ChatToasts'
import type { Toast } from '../types'

describe('ChatToasts', () => {
  it('renders multiple toasts', () => {
    const toasts: Toast[] = [
      { id: 1, message: 'Success message', type: 'success' },
      { id: 2, message: 'Error message', type: 'error' },
      { id: 3, message: 'Info message' }
    ]
    const onDismiss = vi.fn()
    
    const { getByText } = render(<ChatToasts toasts={toasts} onDismiss={onDismiss} />)
    
    expect(getByText('Success message')).toBeTruthy()
    expect(getByText('Error message')).toBeTruthy()
    expect(getByText('Info message')).toBeTruthy()
  })

  it('calls onDismiss when close button is clicked', () => {
    const toasts: Toast[] = [
      { id: 1, message: 'Test toast' }
    ]
    const onDismiss = vi.fn()
    
    const { container } = render(<ChatToasts toasts={toasts} onDismiss={onDismiss} />)
    
    // Find the button with "Close" text
    const closeButton = container.querySelector('button')
    expect(closeButton).toBeTruthy()
    
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(onDismiss).toHaveBeenCalledWith(1)
    }
  })

  it('applies correct styling for different toast types', () => {
    const toasts: Toast[] = [
      { id: 1, message: 'Success', type: 'success' },
      { id: 2, message: 'Error', type: 'error' },
      { id: 3, message: 'Warning', type: 'warning' },
      { id: 4, message: 'Info', type: 'info' }
    ]
    const onDismiss = vi.fn()
    
    const { container } = render(<ChatToasts toasts={toasts} onDismiss={onDismiss} />)
    
    // Check for type-specific classes
    expect(container.querySelector('.bg-primary\\/10')).toBeTruthy() // success
    expect(container.querySelector('.bg-destructive\\/10')).toBeTruthy() // error
    expect(container.querySelector('.bg-accent\\/10')).toBeTruthy() // warning
    expect(container.querySelector('.bg-card')).toBeTruthy() // default/info
  })

  it('renders empty when no toasts', () => {
    const toasts: Toast[] = []
    const onDismiss = vi.fn()
    
    const { container } = render(<ChatToasts toasts={toasts} onDismiss={onDismiss} />)
    
    // Should only have the container div
    const toastContainer = container.querySelector('.fixed.right-3.bottom-16')
    expect(toastContainer).toBeTruthy()
    expect(toastContainer?.children.length).toBe(0)
  })
})
