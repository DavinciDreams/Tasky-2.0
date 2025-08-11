# Tasky MCP Agent - HTTP Server

This is the HTTP version of the Tasky MCP Agent, converted from stdio to run as a dockerized HTTP server.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Set environment variables:**
   ```bash
   export TASKY_TASKS_PATH="/path/to/your/data/tasky-tasks.json"
   export TASKY_CONFIG_PATH="/path/to/your/data/tasky-config-v2.json"
   export PORT=7842
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Test the server:**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Deployment

1. **Build Docker image:**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker Compose:**
   ```bash
   npm run docker:up
   ```

3. **Check logs:**
   ```bash
   npm run docker:logs
   ```

4. **Stop the container:**
   ```bash
   npm run docker:down
   ```

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status and basic information.

### MCP Protocol
```
POST /mcp     - Client-to-server communication
GET /mcp      - Server-to-client notifications (SSE)
DELETE /mcp   - Session termination
```

## 🔧 Configuration

### Environment Variables

- `TASKY_TASKS_PATH`: Path to the tasks JSON file
- `TASKY_CONFIG_PATH`: Path to the configuration JSON file  
- `PORT`: Server port (default: 3000)

### Data Persistence

The server expects two JSON files:
- **Tasks file**: Contains all tasks and their metadata
- **Config file**: Contains application configuration

When using Docker, mount a volume to `/app/data` to persist data:
```bash
docker run -v ./data:/app/data -p 3000:3000 tasky-mcp-agent
```

## 🛠️ Available Tools

The MCP server exposes several tools for task and reminder management:

### Task Management
- `create_task` - Create a new task
- `list_tasks` - List all tasks
- `update_task` - Update an existing task
- `delete_task` - Delete a task
- `get_task` - Get task details

### Reminder Management  
- `create_reminder` - Create a new reminder
- `list_reminders` - List all reminders
- `update_reminder` - Update an existing reminder
- `delete_reminder` - Delete a reminder

## 🔌 Connecting from Cursor

To use this HTTP server with Cursor, update your MCP configuration:

```json
{
  "mcpServers": {
    "tasky-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 🧪 Testing

The server includes a test client to verify functionality:

```bash
node test-http-client.js
```

This will:
1. Initialize an MCP connection
2. List available tools
3. Create a test task
4. List tasks to verify creation

## 🐳 Docker Configuration

### Dockerfile Features
- Multi-stage build for smaller image size
- Health checks for container monitoring
- Non-root user for security
- Optimized for production deployment

### Docker Compose Features
- Volume mounting for data persistence
- Environment variable configuration
- Health check monitoring
- Automatic restart policies

## 🔒 Security Notes

- DNS rebinding protection is disabled for development
- For production, configure proper CORS origins
- Use HTTPS in production environments
- Consider authentication for public deployments

## 📊 Monitoring

The server provides:
- Health check endpoint at `/health`
- Docker health checks
- Structured logging
- Error handling and recovery

## 🚨 Troubleshooting

### Common Issues

1. **406 Not Acceptable**: Client must send `Accept: application/json, text/event-stream`
2. **Connection refused**: Ensure server is running and port is correct
3. **File not found**: Check that data files exist and paths are correct
4. **Permission denied**: Ensure proper file permissions for data directory

### Debug Mode

Start with debug logging:
```bash
DEBUG=* npm start
```

### Container Logs

Check Docker logs:
```bash
docker-compose logs -f tasky-mcp-agent
```

## 📝 Development

### Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run typecheck` - Type checking only
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start with Docker Compose
- `npm run docker:down` - Stop Docker containers

### Project Structure

```
tasky-mcp-agent/
├── src/
│   ├── index.ts          # Main HTTP server
│   ├── tools/            # MCP tools implementation
│   └── utils/            # Utility functions
├── dist/                 # Compiled JavaScript
├── data/                 # Data files (mounted in Docker)
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Multi-container setup
└── test-http-client.js   # Test client
```

## 🤝 Contributing

1. Make changes to TypeScript files in `src/`
2. Build with `npm run build`
3. Test with `npm start`
4. Update Docker image with `npm run docker:build`

## 📄 License

Same as the main Tasky project.
