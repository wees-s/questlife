import { FastifyInstance } from 'fastify';
import { getUserById, getUserAttributes, deleteUser } from '../services/auth.service.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { users, userProfile, userBadges, badges, exploredPlaces } from '../db/schema.js';
import { notFound } from '../utils/errors.js';

export default async function userRoutes(fastify: FastifyInstance) {
  // All routes require auth
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/users/me
  fastify.get('/me', async (request) => {
    const user = await getUserById(request.user.id);
    const attrs = await getUserAttributes(request.user.id);
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

  // PATCH /api/v1/users/me
  fastify.patch('/me', async (request) => {
    const db = getDb();
    const body = request.body as { username?: string; avatarUrl?: string };
    const updates: Record<string, unknown> = {};
    if (body.username) updates.username = body.username;
    if (body.avatarUrl) updates.avatarUrl = body.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, request.user.id));
    }

    return getUserById(request.user.id);
  });

  // GET /api/v1/users/:id/public
  fastify.get('/:id/public', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      class: users.class,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) throw notFound('User not found');
    const attrs = await getUserAttributes(id);
    return { ...user, attributes: attrs };
  });

  // GET /api/v1/users/me/attributes
  fastify.get('/me/attributes', async (request) => {
    return getUserAttributes(request.user.id);
  });

  // GET /api/v1/users/me/badges
  fastify.get('/me/badges', async (request) => {
    const db = getDb();
    const result = await db.select({
      id: badges.id,
      name: badges.name,
      description: badges.description,
      imageUrl: badges.imageUrl,
      rarity: badges.rarity,
      earnedAt: userBadges.earnedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, request.user.id));

    return result;
  });

  // GET /api/v1/users/me/explored-places
  fastify.get('/me/explored-places', async (request) => {
    const db = getDb();
    return db.select().from(exploredPlaces).where(eq(exploredPlaces.userId, request.user.id));
  });

  // DELETE /api/v1/users/me — LGPD/GDPR compliance
  fastify.delete('/me', async (request, reply) => {
    await deleteUser(request.user.id);
    return reply.send({ message: 'Account and all data deleted' });
  });
}
