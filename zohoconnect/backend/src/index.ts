import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers';
import { createContext } from './context';
import { logger } from './lib/logger';
import { initDatabase } from './db';
import { initRedis } from './lib/redis';
import { initWorkers } from './workers';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  // Initialize Fastify
  const fastify = Fastify({
    logger: logger,
    maxParamLength: 5000,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  await fastify.register(websocket);

  // Initialize services
  await initDatabase();
  await initRedis();
  await initWorkers();

  // Register tRPC
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        logger.error({ path, error }, 'tRPC error');
      },
    },
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        r2: 'connected',
        zoho: 'connected'
      }
    };
  });

  // WebSocket for real-time updates
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    connection.socket.on('message', (message) => {
      // Echo back for now
      connection.socket.send(message.toString());
    });
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`🚀 ZohoConnect Backend started on http://${HOST}:${PORT}`);
    logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    logger.info(`🔌 tRPC endpoint: http://${HOST}:${PORT}/trpc`);
    logger.info(`🌐 WebSocket: ws://${HOST}:${PORT}/ws`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
start();
