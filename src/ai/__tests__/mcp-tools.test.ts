import { describe, it, expect, vi, afterEach } from 'vitest'
import { mcpCall } from '../mcp-tools'

describe('mcpCall tool', () => {
	afterEach(() => {
		// @ts-ignore
		global.fetch = undefined
	})

    it('exposes valid AI SDK tool structure', () => {
        expect(mcpCall.description).toBeDefined()
        expect(typeof mcpCall.description).toBe('string')
        // dynamicTool exposes inputSchema; avoid peeking deeply, just assert execute exists
        // @ts-ignore
        expect(mcpCall.inputSchema).toBeDefined()
        expect(mcpCall.execute).toBeDefined()
        expect(typeof mcpCall.execute).toBe('function')
    })

	it('gracefully returns error text when fetch fails', async () => {
		// Auto-accept confirmation
		const acceptHandler = (e: any) => {
			const id = e?.detail?.id
			if (!id) return
			window.dispatchEvent(new CustomEvent('tasky:tool:confirm:response', { detail: { id, accepted: true } } as any))
		}
		window.addEventListener('tasky:tool:confirm', acceptHandler as any)
		// @ts-ignore stub fetch to fail fast
		global.fetch = vi.fn().mockRejectedValue(new Error('fail'))
        const out = await (mcpCall as any).execute(
            { name: 'nonexistent', args: {} }, 
            { toolCallId: 'test-123', abortSignal: undefined, messages: [] }
        )
		window.removeEventListener('tasky:tool:confirm', acceptHandler as any)
		expect(typeof out).toBe('string')
		expect(out.toLowerCase()).toContain('error')
	})
})
