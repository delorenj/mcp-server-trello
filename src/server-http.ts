import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { trelloServer } from './index.js';

const app = express();

// CORS headers for browser clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ❌ REMOVE THIS - it breaks handlePostMessage
// app.use(express.json());

// Active transport sessions keyed by sessionId
const transports: Map<string, SSEServerTransport> = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', server: 'mcp-server-trello' });
});

// SSE endpoint — establishes a new client connection
app.get('/sse', async (req, res) => {
  console.log('[SSE] New client connection');
  const transport = new SSEServerTransport('/messages', res);

  transports.set(transport.sessionId, transport);
  console.log(`[SSE] Session created: ${transport.sessionId}`);

  res.on('close', () => {
    console.log(`[SSE] Session closed: ${transport.sessionId}`);
    transports.delete(transport.sessionId);
  });

  await trelloServer.mcpServer.connect(transport);
});

// Messages endpoint — DO NOT use express.json() here
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: `No active session for sessionId: ${sessionId}` });
    return;
  }

  // handlePostMessage reads the raw stream itself
  await transport.handlePostMessage(req, res);
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  await trelloServer.initialize();
  app.listen(PORT, () => {
    console.log(`mcp-server-trello HTTP/SSE server running on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  SSE:    http://localhost:${PORT}/sse`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});