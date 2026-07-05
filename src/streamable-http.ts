import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response, NextFunction } from 'express';

export interface StreamableHttpOptions {
  port: number;
  host?: string;
  allowedHosts?: string[];
}

const transports: Record<string, StreamableHTTPServerTransport> = {};

function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${apiKey}`) {
    next();
    return;
  }

  res.status(401).json({
    jsonrpc: '2.0',
    error: { code: -32001, message: 'Unauthorized' },
    id: null,
  });
}

function createMcpPostHandler(server: McpServer) {
  return async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'];

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId as string]) {
        transport = transports[sessionId as string];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: id => {
            transports[id] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };
}

function createMcpGetHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId as string]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId as string];
    await transport.handleRequest(req, res);
  };
}

function createMcpDeleteHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId as string]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId as string];
    await transport.handleRequest(req, res);
  };
}

export async function startStreamableHttpServer(
  server: McpServer,
  options: StreamableHttpOptions
): Promise<void> {
  const host = options.host ?? '0.0.0.0';
  const app = createMcpExpressApp({
    host,
    ...(options.allowedHosts?.length ? { allowedHosts: options.allowedHosts } : {}),
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'streamable-http' });
  });

  const postHandler = createMcpPostHandler(server);
  const getHandler = createMcpGetHandler();
  const deleteHandler = createMcpDeleteHandler();

  app.post('/mcp', optionalApiKeyAuth, postHandler);
  app.get('/mcp', optionalApiKeyAuth, getHandler);
  app.delete('/mcp', optionalApiKeyAuth, deleteHandler);

  await new Promise<void>((resolve, reject) => {
    app.listen(options.port, host, error => {
      if (error) {
        reject(error);
        return;
      }
      console.error(
        `Trello MCP server (streamable HTTP) listening on http://${host}:${options.port}/mcp`
      );
      resolve();
    });
  });

  const shutdown = async () => {
    for (const sessionId of Object.keys(transports)) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch {
        // Best-effort cleanup during shutdown
      }
    }
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
