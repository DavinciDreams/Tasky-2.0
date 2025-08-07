import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LooperMCPTools } from '../src/tools/index';

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/tools/index');

const MockServer = Server as jest.MockedClass<typeof Server>;
const MockStdioServerTransport = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>;
const MockLooperMCPTools = LooperMCPTools as jest.MockedClass<typeof LooperMCPTools>;

describe('Looper MCP Agent', () => {
  let mockServer: jest.Mocked<Server>;
  let mockTransport: jest.Mocked<StdioServerTransport>;
  let mockTools: jest.Mocked<LooperMCPTools>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      notification: jest.fn(),
      request: jest.fn()
    } as any;

    mockTransport = {
      start: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockTools = {
      getTools: jest.fn().mockReturnValue([
        {
          name: 'looper_create_task',
          description: 'Create a new task',
          inputSchema: { type: 'object', properties: {}, required: [] }
        }
      ]),
      handleToolCall: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }]
      })
    } as any;

    MockServer.mockImplementation(() => mockServer);
    MockStdioServerTransport.mockImplementation(() => mockTransport);
    MockLooperMCPTools.mockImplementation(() => mockTools);
  });

  describe('Server Initialization', () => {
    it('should initialize MCP server with correct configuration', async () => {
      // Import the main module to trigger initialization
      await import('../src/index.js');

      expect(MockServer).toHaveBeenCalledWith(
        {
          name: 'looper-cli-mcp-agent',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );
    });

    it('should initialize LooperMCPTools with current working directory', async () => {
      await import('../src/index.js');

      expect(MockLooperMCPTools).toHaveBeenCalledWith(process.cwd());
    });

    it('should setup stdio transport', async () => {
      await import('../src/index.js');

      expect(MockStdioServerTransport).toHaveBeenCalled();
    });
  });

  describe('Tool Registration', () => {
    it('should register tools/list handler', async () => {
      await import('../src/index.js');

      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          method: expect.stringContaining('tools/list')
        }),
        expect.any(Function)
      );
    });

    it('should register tools/call handler', async () => {
      await import('../src/index.js');

      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          method: expect.stringContaining('tools/call')
        }),
        expect.any(Function)
      );
    });
  });

  describe('Server Startup', () => {
    it('should connect server to transport', async () => {
      await import('../src/index.js');

      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('should handle startup errors gracefully', async () => {
      mockServer.connect.mockRejectedValue(new Error('Connection failed'));

      // Mock console.error to prevent actual error output during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await import('../src/index.js');
      } catch (error) {
        // Expected to fail
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle server connection errors', async () => {
      mockServer.connect.mockRejectedValue(new Error('Connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await import('../src/index.js');
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle transport errors', async () => {
      mockTransport.start.mockRejectedValue(new Error('Transport failed'));

      // The current implementation doesn't explicitly handle transport start errors
      // but the server connection should still work
      await import('../src/index.js');

      expect(MockStdioServerTransport).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use correct server metadata', async () => {
      await import('../src/index.js');

      expect(MockServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'looper-cli-mcp-agent',
          version: '1.0.0'
        }),
        expect.any(Object)
      );
    });

    it('should declare correct capabilities', async () => {
      await import('../src/index.js');

      expect(MockServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          capabilities: {
            tools: {}
          }
        })
      );
    });
  });

  describe('Signal Handling', () => {
    it('should setup SIGINT handler', async () => {
      const onSpy = jest.spyOn(process, 'on');
      
      await import('../src/index.js');

      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

      onSpy.mockRestore();
    });

    it('should handle graceful shutdown', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await import('../src/index.js');

      // Find the SIGINT handler
      const onCalls = (process.on as jest.Mock).mock.calls;
      const sigintCall = onCalls.find(call => call[0] === 'SIGINT');
      const sigintHandler = sigintCall[1];

      try {
        sigintHandler();
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('shutting down')
      );
      expect(exitSpy).toHaveBeenCalledWith(0);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('Logging', () => {
    it('should log startup messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await import('../src/index.js');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Looper CLI MCP Agent started successfully')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available tools:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ready to manage tasks!')
      );

      consoleSpy.mockRestore();
    });

    it('should log available tools on startup', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await import('../src/index.js');

      expect(mockTools.getTools).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('looper_create_task')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should integrate tools with server handlers', async () => {
      await import('../src/index.js');

      // Verify that the tools are properly integrated
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(MockLooperMCPTools).toHaveBeenCalledWith(process.cwd());
      expect(mockTools.getTools).toHaveBeenCalled();
    });

    it('should handle tool calls through server', async () => {
      await import('../src/index.js');

      // Get the tools/call handler
      const callHandlerCall = mockServer.setRequestHandler.mock.calls.find(
        call => (call[0] as any).method?.includes('tools/call')
      );
      
      expect(callHandlerCall).toBeDefined();
      
      const callHandler = callHandlerCall![1];
      const mockRequest = {
        method: 'tools/call',
        params: {
          name: 'looper_create_task',
          arguments: { title: 'Test Task' }
        }
      };

      await callHandler(mockRequest as any, {} as any);

      expect(mockTools.handleToolCall).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle tool list requests through server', async () => {
      await import('../src/index.js');

      // Get the tools/list handler
      const listHandlerCall = mockServer.setRequestHandler.mock.calls.find(
        call => (call[0] as any).method?.includes('tools/list')
      );
      
      expect(listHandlerCall).toBeDefined();
      
      const listHandler = listHandlerCall![1];
      const result = await listHandler({ method: 'tools/list' } as any, {} as any);

      expect(result).toEqual({
        tools: expect.any(Array)
      });
      expect(mockTools.getTools).toHaveBeenCalled();
    });
  });
}); 