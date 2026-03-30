/**
 * Standalone offline Fastify app that uses in-memory mock database.
 * No external dependencies (PostgreSQL, Redis, APIs) required.
 * Run with: OFFLINE_MODE=true npm run dev
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fjwt from '@fastify/jwt';
import { mockDb } from './mockDb.js';
import { ZodError } from 'zod';

const JWT_SECRET = 'offline-dev-secret';

export async function buildOfflineApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(fjwt, { secret: JWT_SECRET, sign: { expiresIn: '1h' } });

  // Auth decorator
  app.decorate('authenticate', async function (request: any) {
    try {
      await request.jwtVerify();
    } catch {
      throw { statusCode: 401, message: 'Unauthorized' };
    }
  });

  // Error handler
  app.setErrorHandler((error: any, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    const status = error.statusCode || 500;
    const code = error.code || 'ERROR';
    const message = error.message || 'Internal error';
    return reply.status(status).send({ error: { code, message } });
  });

  // HEALTH
  app.get('/api/v1/health', async () => ({
    status: 'ok',
    mode: 'OFFLINE',
    timestamp: new Date().toISOString(),
    usersCount: mockDb.users.length,
    questsCount: mockDb.quests.length,
  }));

  // AUTH ROUTES
  app.post('/api/v1/auth/register', async (request, reply) => {
    const { username, email, password, class: userClass } = request.body as any;
    try {
      const user = await mockDb.registerUser(username, email, password, userClass || 'explorador');
      const accessToken = app.jwt.sign({ id: user.id, username: user.username, email: user.email });
      const refreshToken = mockDb.createRefreshToken(user.id);
      return reply.status(201).send({ user, accessToken, refreshToken });
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') {
        return reply.status(409).send({ error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
      }
      if (err.message === 'USERNAME_EXISTS') {
        return reply.status(409).send({ error: { code: 'USERNAME_EXISTS', message: 'Username taken' } });
      }
      throw err;
    }
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    try {
      const user = await mockDb.loginUser(email, password);
      const accessToken = app.jwt.sign({ id: user.id, username: user.username, email: user.email });
      const refreshToken = mockDb.createRefreshToken(user.id);
      return reply.send({ user, accessToken, refreshToken });
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as any;
    try {
      const user = mockDb.verifyRefreshToken(refreshToken);
      mockDb.revokeRefreshToken(refreshToken);
      const newRefreshToken = mockDb.createRefreshToken(user.id);
      const accessToken = app.jwt.sign({ id: user.id, username: user.username, email: user.email });
      return reply.send({ user, accessToken, refreshToken: newRefreshToken });
    } catch {
      return reply.status(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } });
    }
  });

  app.post('/api/v1/auth/logout', async (_request, reply) => {
    return reply.send({ message: 'Logged out' });
  });

  // USER ROUTES
  app.get('/api/v1/users/me', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const user = mockDb.getUser(request.user.id);
    const attrs = mockDb.getAttributes(request.user.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      class: user.class,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      attributes: attrs,
    };
  });

  app.get('/api/v1/users/me/attributes', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    return mockDb.getAttributes(request.user.id);
  });

  app.delete('/api/v1/users/me', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    mockDb.deleteUser(request.user.id);
    return reply.send({ message: 'Account deleted' });
  });

  // QUEST ROUTES
  app.get('/api/v1/quests', { preHandler: [(app as any).authenticate] }, async () => {
    return mockDb.getQuests();
  });

  app.get('/api/v1/quests/:id', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    const quest = mockDb.getQuest(request.params.id);
    if (!quest) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Quest not found' } });
    return quest;
  });

  app.post('/api/v1/quests/:id/start', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    try {
      const uq = mockDb.startQuest(request.user.id, request.params.id);
      return reply.status(201).send(uq);
    } catch (err: any) {
      if (err.message === 'QUEST_ALREADY_ACTIVE') {
        return reply.status(400).send({ error: { code: 'QUEST_ALREADY_ACTIVE', message: 'Quest already active' } });
      }
      throw err;
    }
  });

  app.post('/api/v1/quests/:id/heartbeat', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    return { status: 'active', message: 'Heartbeat received (offline mode)' };
  });

  app.post('/api/v1/quests/:id/track', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    return { totalDistance: 0, trackPoints: 0, message: 'GPS track received (offline mode)' };
  });

  app.post('/api/v1/quests/:id/abandon', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    return { message: 'Quest abandoned (offline mode)' };
  });

  app.post('/api/v1/quests/generate', { preHandler: [(app as any).authenticate] }, async () => {
    return {
      message: 'Mock quest generation (offline mode)',
      quests: [
        { title: 'Explorador Local', description: 'Caminhe 1km', pillar: 'corpo', xp_rewards: { vitalidade: 10, total: 10 } },
        { title: 'Momento Zen', description: 'Medite 5min', pillar: 'mente', xp_rewards: { inteligencia: 8, total: 8 } },
        { title: 'Bate-papo', description: 'Converse 5min', pillar: 'social', xp_rewards: { carisma: 10, total: 10 } },
      ],
    };
  });

  return app;
}
