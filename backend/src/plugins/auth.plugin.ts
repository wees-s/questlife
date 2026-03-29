import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import { config } from '../config.js';
import { unauthorized } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; username: string; email: string };
    user: { id: string; username: string; email: string };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fjwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw unauthorized('Invalid or expired token');
    }
  });
}

export default fp(authPlugin);
