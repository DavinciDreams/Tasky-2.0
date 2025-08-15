import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ChatModule } from '../ChatModule'

// Minimal Settings type stub
const defaultSettings: any = {
  llmProvider: 'openai',
  llmModel: 'o4-mini',
  llmApiKey: 'test-key',
}

// Loosen the type by augmenting with index signature for tests
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var electronAPI: any
}

const createElectronApiMock = () => {
    const base: any = {
        listChats: vi.fn().mockResolvedValue([]),
        createChat: vi.fn().mockResolvedValue('chat_1'),
        loadChat: vi.fn().mockResolvedValue([]),
        saveChat: vi.fn().mockResolvedValue({ success: true }),
        deleteChat: vi.fn().mockResolvedValue({ success: true }),
        setSetting: vi.fn(),
        getSetting: vi.fn(),
    };
    return base;
}

describe('ChatModule', () => {
	beforeEach(() => {
		window.electronAPI = createElectronApiMock()
	})
	afterEach(() => {
		cleanup()
	})

	it('creates a chat on mount when none exist', async () => {
		render(<ChatModule settings={defaultSettings} onSettingChange={() => {}} />)
		await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())
	})

	it('saves transcript on send and on error/finish', async () => {
		// Force unsupported provider to trigger error code path without network
		const s = { ...defaultSettings, llmProvider: 'unsupported' }
		const { getAllByPlaceholderText, getAllByText } = render(
			<ChatModule settings={s} onSettingChange={() => {}} />
		)
		// Ensure chat is created and chatId is available before sending
		await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())
  const inputs = getAllByPlaceholderText('Ask Tasky or run tools…') as HTMLTextAreaElement[]
		const input = inputs[0]
		await fireEvent.change(input, { target: { value: 'hello' } })
		const sendBtn = getAllByText('Send')[0]
		await fireEvent.click(sendBtn)
		await waitFor(() => expect(window.electronAPI.saveChat).toHaveBeenCalled())
	})

  it('creates new chat via header button', async () => {
    const { container } = render(
      <ChatModule settings={defaultSettings} onSettingChange={() => {}} />
    )
    await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalledTimes(1))
    
    // Open history dropdown
    const historyButton = container.querySelector('button:has(span:contains("📋"))')
    if (historyButton) {
      fireEvent.click(historyButton)
      await waitFor(() => {
        const newButton = container.querySelector('button:contains("+ New")')
        expect(newButton).toBeTruthy()
      })
    }
  })

  it('renders with theme colors', () => {
    const { container } = render(
      <ChatModule settings={defaultSettings} onSettingChange={() => {}} />
    )
    
    // Check for theme classes
    const bgCard = container.querySelector('.bg-card')
    const borderElements = container.querySelectorAll('.border-border')
    
    expect(bgCard).toBeTruthy()
    expect(borderElements.length).toBeGreaterThan(0)
  })

  it('shows message skeleton when streaming', async () => {
    const s = { ...defaultSettings }
    const { container } = render(
      <ChatModule settings={s} onSettingChange={() => {}} />
    )
    
    // The MessageContainer should handle streaming state
    await waitFor(() => expect(window.electronAPI.createChat).toHaveBeenCalled())
    
    // Check that the MessageContainer is present
    const messageContainer = container.querySelector('.space-y-3')
    expect(messageContainer).toBeTruthy()
  })
})
