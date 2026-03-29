import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { AppError } from './utils/errors.js';
import { ZodError } from 'zod';
import authPlugin from './plugins/auth.plugin.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import questRoutes from './routes/quest.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true },
      } : undefined,
    },
  });

  // Security plugins
  await app.register(cors, {
    origin: config.NODE_ENV === 'production'
      ? ['https://lifequest.app']
      : true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth plugin (JWT)
  await app.register(authPlugin);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.errors,
        },
      });
    }

    // Fastify rate limit error
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  // Health check
  app.get('/api/v1/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      offlineMode: config.OFFLINE_MODE,
    };
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(questRoutes, { prefix: '/api/v1/quests' });

  return app;
}
