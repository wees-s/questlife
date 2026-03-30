import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { quests, userQuests, characterAttributes } from '../db/schema.js';
import { notFound, badRequest } from '../utils/errors.js';
import { applyXpRewards, calculateLevel } from '../utils/progression.js';
import { getUserById } from '../services/auth.service.js';
import { z } from 'zod';

const trackSchema = z.object({
  points: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    timestamp: z.number(),
  })),
});

const heartbeatSchema = z.object({
  timestamp: z.number(),
});

export default async function questRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/quests — list available quests
  fastify.get('/', async (request) => {
    const db = getDb();
    const allQuests = await db.select().from(quests).where(eq(quests.status, 'active'));
    return allQuests;
  });

  // GET /api/v1/quests/:id
  fastify.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [quest] = await db.select().from(quests).where(eq(quests.id, id)).limit(1);
    if (!quest) throw notFound('Quest not found');
    return quest;
  });

  // POST /api/v1/quests/:id/start
  fastify.post('/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const [quest] = await db.select().from(quests).where(eq(quests.id, id)).limit(1);
    if (!quest) throw notFound('Quest not found');

    // Check if user already has this quest active
    const existing = await db.select().from(userQuests)
      .where(and(
        eq(userQuests.userId, request.user.id),
        eq(userQuests.questId, id),
        eq(userQuests.status, 'active'),
      )).limit(1);

    if (existing.length > 0) {
      throw badRequest('QUEST_ALREADY_ACTIVE', 'You already have this quest active');
    }

    const [userQuest] = await db.insert(userQuests).values({
      userId: request.user.id,
      questId: id,
      status: 'active',
    }).returning();

    return reply.status(201).send(userQuest);
  });

  // POST /api/v1/quests/:id/track — GPS batch
  fastify.post('/:id/track', async (request) => {
    const { id } = request.params as { id: string };
    const body = trackSchema.parse(request.body);
    const db = getDb();

    const [uq] = await db.select().from(userQuests)
      .where(and(
        eq(userQuests.userId, request.user.id),
        eq(userQuests.questId, id),
        eq(userQuests.status, 'active'),
      )).limit(1);

    if (!uq) throw notFound('Active quest not found');

    // Append GPS points to existing track
    const existingTrack = (uq.gpsTrack as Array<{ lat: number; lng: number; timestamp: number }>) || [];
    const newTrack = [...existingTrack, ...body.points];

    // Anti-cheat: check for teleports and excessive speed
    for (let i = 1; i < body.points.length; i++) {
      const prev = body.points[i - 1];
      const curr = body.points[i];
      const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;
      if (timeDiffSeconds <= 0) continue;

      // Approximate distance in meters using Haversine
      const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      const speedKmh = (dist / 1000) / (timeDiffSeconds / 3600);

      if (speedKmh > 50) {
        fastify.log.warn({ userId: request.user.id, questId: id, speedKmh }, 'GPS anti-cheat: excessive speed');
        // Don't reject the whole batch, just skip suspicious points
        continue;
      }

      if (dist > 500 && timeDiffSeconds < 30) {
        fastify.log.warn({ userId: request.user.id, questId: id, dist, timeDiffSeconds }, 'GPS anti-cheat: teleport detected');
        continue;
      }
    }

    await db.update(userQuests)
      .set({ gpsTrack: newTrack })
      .where(eq(userQuests.id, uq.id));

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < newTrack.length; i++) {
      totalDistance += haversineDistance(newTrack[i - 1].lat, newTrack[i - 1].lng, newTrack[i].lat, newTrack[i].lng);
    }

    // Check if quest is complete
    const [quest] = await db.select().from(quests).where(eq(quests.id, id)).limit(1);
    const reqs = quest?.requirements as { distance_meters?: number } | null;
    if (reqs?.distance_meters && totalDistance >= reqs.distance_meters) {
      await completeQuest(db, uq.id, request.user.id, quest);
    }

    return { totalDistance: Math.round(totalDistance), trackPoints: newTrack.length };
  });

  // POST /api/v1/quests/:id/heartbeat — timer quests
  fastify.post('/:id/heartbeat', async (request) => {
    const { id } = request.params as { id: string };
    const body = heartbeatSchema.parse(request.body);
    const db = getDb();

    const [uq] = await db.select().from(userQuests)
      .where(and(
        eq(userQuests.userId, request.user.id),
        eq(userQuests.questId, id),
        eq(userQuests.status, 'active'),
      )).limit(1);

    if (!uq) throw notFound('Active quest not found');

    const validationData = (uq.validationData as { heartbeats?: number[]; lastHeartbeat?: number }) || {};
    const heartbeats = validationData.heartbeats || [];
    const lastHeartbeat = validationData.lastHeartbeat || 0;

    // Anti-cheat: reject if gap between heartbeats > 90 seconds
    if (lastHeartbeat && (body.timestamp - lastHeartbeat) > 90000) {
      fastify.log.warn({ userId: request.user.id, questId: id }, 'Timer anti-cheat: heartbeat gap too large');
      return { status: 'gap_too_large', message: 'Heartbeat gap exceeded 90 seconds' };
    }

    heartbeats.push(body.timestamp);
    await db.update(userQuests).set({
      validationData: { heartbeats, lastHeartbeat: body.timestamp },
    }).where(eq(userQuests.id, uq.id));

    // Check if enough time has passed
    const [quest] = await db.select().from(quests).where(eq(quests.id, id)).limit(1);
    const reqs = quest?.requirements as { duration_seconds?: number } | null;
    if (reqs?.duration_seconds && heartbeats.length > 1) {
      const totalSeconds = (heartbeats[heartbeats.length - 1] - heartbeats[0]) / 1000;
      if (totalSeconds >= reqs.duration_seconds) {
        await completeQuest(db, uq.id, request.user.id, quest);
        return { status: 'completed', totalSeconds };
      }
    }

    return { status: 'active', heartbeatCount: heartbeats.length };
  });

  // POST /api/v1/quests/:id/abandon
  fastify.post('/:id/abandon', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const result = await db.update(userQuests)
      .set({ status: 'failed' })
      .where(and(
        eq(userQuests.userId, request.user.id),
        eq(userQuests.questId, id),
        eq(userQuests.status, 'active'),
      ))
      .returning();

    if (result.length === 0) throw notFound('Active quest not found');
    return { message: 'Quest abandoned' };
  });

  // POST /api/v1/quests/generate — trigger AI quest generation (stub for offline mode)
  fastify.post('/generate', async (request) => {
    // In offline mode, return mock quests
    return {
      message: 'Quest generation triggered',
      quests: [
        {
          title: 'Explorador Local',
          description: 'Caminhe 1km pelo seu bairro',
          pillar: 'corpo',
          validation_type: 'gps',
          xp_rewards: { vitalidade: 10, disciplina: 3, total: 13 },
        },
        {
          title: 'Momento Zen',
          description: 'Medite por 5 minutos',
          pillar: 'mente',
          validation_type: 'timer',
          xp_rewards: { inteligencia: 8, disciplina: 5, total: 13 },
        },
        {
          title: 'Bate-papo Rápido',
          description: 'Converse no lobby por 5 minutos',
          pillar: 'social',
          validation_type: 'chat',
          xp_rewards: { carisma: 10, coragem: 3, total: 13 },
        },
      ],
    };
  });
}

async function completeQuest(
  db: ReturnType<typeof getDb>,
  userQuestId: string,
  userId: string,
  quest: typeof quests.$inferSelect,
) {
  // Mark quest as completed
  await db.update(userQuests)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(userQuests.id, userQuestId));

  // Credit XP
  const rewards = quest.xpRewards as Record<string, number>;
  const [attrs] = await db.select().from(characterAttributes)
    .where(eq(characterAttributes.userId, userId)).limit(1);

  if (attrs) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (rewards.vitalidade) updates.vitalidade = attrs.vitalidade + (rewards.vitalidade || 0);
    if (rewards.carisma) updates.carisma = attrs.carisma + (rewards.carisma || 0);
    if (rewards.inteligencia) updates.inteligencia = attrs.inteligencia + (rewards.inteligencia || 0);
    if (rewards.disciplina) updates.disciplina = attrs.disciplina + (rewards.disciplina || 0);
    if (rewards.criatividade) updates.criatividade = attrs.criatividade + (rewards.criatividade || 0);
    if (rewards.coragem) updates.coragem = attrs.coragem + (rewards.coragem || 0);

    const newTotalXp = attrs.totalXp + (rewards.total || 0);
    updates.totalXp = newTotalXp;
    updates.level = calculateLevel(newTotalXp);

    await db.update(characterAttributes).set(updates).where(eq(characterAttributes.id, attrs.id));
  }
}

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
