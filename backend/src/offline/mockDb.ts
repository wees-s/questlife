/**
 * In-memory mock database for OFFLINE testing.
 * No PostgreSQL or Redis required.
 * Usage: Set OFFLINE_MODE=true in .env
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface MockUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  class: string;
  avatarUrl: string | null;
  createdAt: Date;
  lastActiveAt: Date | null;
}

interface MockAttributes {
  id: string;
  userId: string;
  vitalidade: number;
  carisma: number;
  inteligencia: number;
  disciplina: number;
  criatividade: number;
  coragem: number;
  totalXp: number;
  level: number;
}

interface MockQuest {
  id: string;
  title: string;
  description: string;
  pillar: string;
  type: string;
  validationType: string;
  xpRewards: Record<string, number>;
  requirements: Record<string, unknown>;
  narrativeFlavor: string;
  status: string;
  isAiGenerated: boolean;
  createdAt: Date;
}

interface MockUserQuest {
  id: string;
  userId: string;
  questId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  gpsTrack: Array<{ lat: number; lng: number; timestamp: number }>;
  validationData: Record<string, unknown>;
}

interface MockRefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

class MockDatabase {
  users: MockUser[] = [];
  attributes: MockAttributes[] = [];
  quests: MockQuest[] = [];
  userQuests: MockUserQuest[] = [];
  refreshTokens: MockRefreshToken[] = [];

  constructor() {
    this.seedQuests();
  }

  private uuid(): string {
    return crypto.randomUUID();
  }

  private seedQuests() {
    const seeds = [
      {
        title: 'Caminhada do Despertar',
        description: 'Caminhe 2km pelo seu bairro.',
        pillar: 'corpo',
        type: 'daily',
        validationType: 'gps',
        xpRewards: { vitalidade: 15, disciplina: 5, total: 20 },
        requirements: { distance_meters: 2000 },
        narrativeFlavor: 'Os ventos da QuestCity sopram ao seu favor.',
      },
      {
        title: 'Meditacao do Sabio',
        description: 'Medite por 10 minutos.',
        pillar: 'mente',
        type: 'daily',
        validationType: 'timer',
        xpRewards: { inteligencia: 10, disciplina: 8, total: 18 },
        requirements: { duration_seconds: 600 },
        narrativeFlavor: 'Na biblioteca silenciosa de QuestCity, os sabios encontram respostas.',
      },
      {
        title: 'Conversa de Taverna',
        description: 'Participe de um lobby de chat por 5 minutos.',
        pillar: 'social',
        type: 'daily',
        validationType: 'chat',
        xpRewards: { carisma: 12, coragem: 5, total: 17 },
        requirements: { min_duration_seconds: 300, min_messages: 8 },
        narrativeFlavor: 'A taverna de QuestCity ferve de historias.',
      },
      {
        title: 'Foco Absoluto',
        description: 'Estude por 25 minutos sem interrupcoes.',
        pillar: 'mente',
        type: 'daily',
        validationType: 'timer',
        xpRewards: { inteligencia: 15, disciplina: 10, criatividade: 5, total: 30 },
        requirements: { duration_seconds: 1500 },
        narrativeFlavor: 'Os pergaminhos antigos so revelam seu conteudo a quem dedica tempo.',
      },
      {
        title: 'Corrida do Explorador',
        description: 'Corra 3km pela cidade.',
        pillar: 'corpo',
        type: 'daily',
        validationType: 'gps',
        xpRewards: { vitalidade: 25, coragem: 10, disciplina: 5, total: 40 },
        requirements: { distance_meters: 3000 },
        narrativeFlavor: 'Apenas os mais ageis decifram os segredos das ruas.',
      },
    ];

    for (const s of seeds) {
      this.quests.push({
        id: this.uuid(),
        ...s,
        status: 'active',
        isAiGenerated: false,
        createdAt: new Date(),
      });
    }
  }

  // AUTH
  async registerUser(username: string, email: string, password: string, userClass: string) {
    if (this.users.find((u) => u.email === email)) {
      throw new Error('EMAIL_EXISTS');
    }
    if (this.users.find((u) => u.username === username)) {
      throw new Error('USERNAME_EXISTS');
    }

    const id = this.uuid();
    const passwordHash = await bcrypt.hash(password, 4); // fast hash for dev
    const user: MockUser = {
      id,
      username,
      email,
      passwordHash,
      class: userClass,
      avatarUrl: null,
      createdAt: new Date(),
      lastActiveAt: null,
    };
    this.users.push(user);

    this.attributes.push({
      id: this.uuid(),
      userId: id,
      vitalidade: 0,
      carisma: 0,
      inteligencia: 0,
      disciplina: 0,
      criatividade: 0,
      coragem: 0,
      totalXp: 0,
      level: 1,
    });

    return { id, username, email, class: userClass };
  }

  async loginUser(email: string, password: string) {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error('INVALID_CREDENTIALS');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('INVALID_CREDENTIALS');
    user.lastActiveAt = new Date();
    return { id: user.id, username: user.username, email: user.email, class: user.class };
  }

  createRefreshToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.refreshTokens.push({
      id: this.uuid(),
      userId,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return token;
  }

  verifyRefreshToken(token: string) {
    const rt = this.refreshTokens.find((t) => t.token === token);
    if (!rt || rt.expiresAt < new Date()) throw new Error('INVALID_TOKEN');
    const user = this.users.find((u) => u.id === rt.userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    return { id: user.id, username: user.username, email: user.email, class: user.class };
  }

  revokeRefreshToken(token: string) {
    this.refreshTokens = this.refreshTokens.filter((t) => t.token !== token);
  }

  // USERS
  getUser(userId: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    return user;
  }

  getAttributes(userId: string) {
    return this.attributes.find((a) => a.userId === userId) || null;
  }

  // QUESTS
  getQuests() {
    return this.quests.filter((q) => q.status === 'active');
  }

  getQuest(id: string) {
    return this.quests.find((q) => q.id === id) || null;
  }

  startQuest(userId: string, questId: string) {
    const existing = this.userQuests.find(
      (uq) => uq.userId === userId && uq.questId === questId && uq.status === 'active',
    );
    if (existing) throw new Error('QUEST_ALREADY_ACTIVE');

    const uq: MockUserQuest = {
      id: this.uuid(),
      userId,
      questId,
      status: 'active',
      startedAt: new Date(),
      completedAt: null,
      gpsTrack: [],
      validationData: {},
    };
    this.userQuests.push(uq);
    return uq;
  }

  deleteUser(userId: string) {
    this.users = this.users.filter((u) => u.id !== userId);
    this.attributes = this.attributes.filter((a) => a.userId !== userId);
    this.userQuests = this.userQuests.filter((uq) => uq.userId !== userId);
    this.refreshTokens = this.refreshTokens.filter((t) => t.userId !== userId);
  }
}

export const mockDb = new MockDatabase();
