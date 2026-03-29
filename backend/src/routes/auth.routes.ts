import { FastifyInstance } from 'fastify';
import {
  registerUser,
  loginUser,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  registerSchema,
  loginSchema,
} from '../services/auth.service.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const user = await registerUser(input);
    const accessToken = fastify.jwt.sign({ id: user.id, username: user.username, email: user.email });
    const refreshToken = await createRefreshToken(user.id);

    return reply.status(201).send({
      user,
      accessToken,
      refreshToken,
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await loginUser(input);
    const accessToken = fastify.jwt.sign({ id: user.id, username: user.username, email: user.email });
    const refreshToken = await createRefreshToken(user.id);

    return reply.send({
      user,
      accessToken,
      refreshToken,
    });
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send({ error: { code: 'MISSING_TOKEN', message: 'Refresh token required' } });
    }

    const user = await verifyRefreshToken(refreshToken);

    // Rotate refresh token
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await createRefreshToken(user.id);
    const accessToken = fastify.jwt.sign({ id: user.id, username: user.username, email: user.email });

    return reply.send({
      user,
      accessToken,
      refreshToken: newRefreshToken,
    });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return reply.send({ message: 'Logged out' });
  });

  // POST /api/v1/auth/logout-all
  fastify.post('/logout-all', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    await revokeAllUserTokens(request.user.id);
    return reply.send({ message: 'All sessions revoked' });
  });
}
