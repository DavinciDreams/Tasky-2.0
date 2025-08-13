import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, waitFor, screen, fireEvent } from '@testing-library/react'
import { ChatModule } from '../ChatModule'

const defaultSettings: any = {
	llmProvider: 'openai',
	llmModel: 'o4-mini',
	llmApiKey: 'test-key',
}

const createElectronApiMock = () => ({
	// Minimal stubs to satisfy ChatModule
	listChats: vi.fn().mockResolvedValue([]),
	createChat: vi.fn().mockResolvedValue('chat_1'),
	loadChat: vi.fn().mockResolvedValue([]),
	saveChat: vi.fn().mockResolvedValue({ success: true }),
	deleteChat: vi.fn().mockResolvedValue({ success: true }),
	// Unused stubs to satisfy type surface if accessed
	setSetting: vi.fn(),
	getSetting: vi.fn(),
})

describe('ChatModule tools UI', () => {
	beforeEach(() => {
		// @ts-ignore runtime stub for tests
		window.electronAPI = createElectronApiMock()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('shows confirmation card and emits accepted response', async () => {
		render(<ChatModule settings={defaultSettings} onSettingChange={() => {}} />)
		await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())

		const id = 'tool_1'
		// Listen for response
		const received: any[] = []
		const listener = (e: any) => received.push(e.detail)
		window.addEventListener('tasky:tool:confirm:response', listener as any)

		// Dispatch confirm request
		window.dispatchEvent(new CustomEvent('tasky:tool:confirm', { detail: { id, name: 'tasky_delete_task', args: { id: 'abc123' } } }))

    // Card renders with content (new heading)
  await waitFor(() => expect(screen.queryAllByText('Confirm Action').length).toBeGreaterThan(0))
  expect(screen.getByText('tasky_delete_task')).toBeTruthy()
  expect(screen.getByText(/abc123/)).toBeTruthy()

		// Confirm
    const confirmBtn = screen.getAllByText('Confirm')[0]
		fireEvent.click(confirmBtn)

		await waitFor(() => {
			expect(received.length).toBeGreaterThan(0)
			expect(received[0]).toEqual({ id, accepted: true })
		})

		window.removeEventListener('tasky:tool:confirm:response', listener as any)
	})

	it('shows running… while tool is executing and hides after done', async () => {
		render(<ChatModule settings={defaultSettings} onSettingChange={() => {}} />)
		await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())

		const id = 'tool_2'
		// Start
		window.dispatchEvent(new CustomEvent('tasky:tool', { detail: { id, phase: 'start', name: 'tasky_create_task', args: { title: 'T' } } }))
    await waitFor(() => expect(screen.queryAllByText(/Executing/).length).toBeGreaterThan(0))
		// Done
		window.dispatchEvent(new CustomEvent('tasky:tool', { detail: { id, phase: 'done', name: 'tasky_create_task' } }))
    await waitFor(() => {
            const runningBadges = screen.queryAllByText(/Executing/)
            expect(runningBadges.length).toBe(0)
    })
	})

	it('cancel from confirmation emits rejected response', async () => {
		render(<ChatModule settings={defaultSettings} onSettingChange={() => {}} />)
		await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())

		const id = 'tool_3'
		const received: any[] = []
		const listener = (e: any) => received.push(e.detail)
		window.addEventListener('tasky:tool:confirm:response', listener as any)

		window.dispatchEvent(new CustomEvent('tasky:tool:confirm', { detail: { id, name: 'tasky_update_task', args: { id: 't', status: 'COMPLETED' } } }))
    await waitFor(() => expect(screen.queryAllByText('Confirm Action').length).toBeGreaterThan(0))
		const cancelBtn = screen.getAllByText('Cancel')[0]
		fireEvent.click(cancelBtn)
		await waitFor(() => {
			expect(received.length).toBeGreaterThan(0)
			expect(received[0]).toEqual({ id, accepted: false })
		})
		window.removeEventListener('tasky:tool:confirm:response', listener as any)
	})
})
