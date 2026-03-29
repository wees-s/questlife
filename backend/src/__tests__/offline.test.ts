import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildOfflineApp } from '../offline/offlineApp.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildOfflineApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.mode).toBe('OFFLINE');
  });
});

describe('Auth - Register', () => {
  it('should register a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        class: 'explorador',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.username).toBe('testuser');
    expect(body.user.email).toBe('test@example.com');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('should reject duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('should reject duplicate username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password123',
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('Auth - Login', () => {
  it('should login with correct credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe('test@example.com');
    expect(body.accessToken).toBeTruthy();
  });

  it('should reject wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('should reject non-existent email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Auth - Refresh Token', () => {
  it('should refresh access token', async () => {
    // Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const { refreshToken } = loginRes.json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    // Old refresh token should be revoked
    expect(body.refreshToken).not.toBe(refreshToken);
  });
});

describe('User - Profile', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    accessToken = res.json().accessToken;
  });

  it('should get user profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.username).toBe('testuser');
    expect(body.attributes).toBeTruthy();
    expect(body.attributes.level).toBe(1);
  });

  it('should reject unauthenticated request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should get user attributes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/attributes',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.vitalidade).toBe(0);
    expect(body.totalXp).toBe(0);
  });
});

describe('Quests', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    accessToken = res.json().accessToken;
  });

  it('should list available quests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/quests',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].title).toBeTruthy();
    expect(body[0].pillar).toBeTruthy();
  });

  it('should get a single quest', async () => {
    // First get all quests
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/quests',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const quests = listRes.json();
    const questId = quests[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/quests/${questId}`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(questId);
  });

  it('should start a quest', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/quests',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const questId = listRes.json()[0].id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/quests/${questId}/start`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('active');
  });

  it('should not start the same quest twice', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/quests',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const questId = listRes.json()[0].id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/quests/${questId}/start`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should generate mock quests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quests/generate',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quests.length).toBe(3);
  });
});

describe('Progression', () => {
  it('should calculate level correctly', async () => {
    const { calculateLevel, xpForNextLevel } = await import('../utils/progression.js');
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(400)).toBe(3);
    expect(calculateLevel(900)).toBe(4);
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(2)).toBe(400);
    expect(xpForNextLevel(5)).toBe(2500);
  });
});
