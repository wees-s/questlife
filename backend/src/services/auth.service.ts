import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { users, characterAttributes, userProfile, userReputation, refreshTokens } from '../db/schema.js';
import { badRequest, conflict, unauthorized, notFound } from '../utils/errors.js';
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  class: z.enum(['explorador', 'academico', 'atleta', 'social', 'criador']).default('explorador'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export async function registerUser(input: RegisterInput) {
  const db = getDb();

  // Check existing user
  const existingEmail = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existingEmail.length > 0) {
    throw conflict('EMAIL_EXISTS', 'Email already registered');
  }

  const existingUsername = await db.select().from(users).where(eq(users.username, input.username)).limit(1);
  if (existingUsername.length > 0) {
    throw conflict('USERNAME_EXISTS', 'Username already taken');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const [user] = await db.insert(users).values({
    username: input.username,
    email: input.email,
    passwordHash,
    class: input.class,
  }).returning();

  // Create initial character attributes
  await db.insert(characterAttributes).values({
    userId: user.id,
  });

  // Create empty user profile
  await db.insert(userProfile).values({
    userId: user.id,
  });

  // Create reputation entry
  await db.insert(userReputation).values({
    userId: user.id,
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    class: user.class,
  };
}

export async function loginUser(input: LoginInput) {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  if (!user.passwordHash) {
    throw unauthorized('Account uses OAuth login');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw unauthorized('Invalid email or password');
  }

  // Update last active
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    class: user.class,
  };
}

export async function createRefreshToken(userId: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function verifyRefreshToken(token: string) {
  const db = getDb();

  const [rt] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1);
  if (!rt) {
    throw unauthorized('Invalid refresh token');
  }

  if (new Date() > rt.expiresAt) {
    // Delete expired token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, rt.id));
    throw unauthorized('Refresh token expired');
  }

  const [user] = await db.select().from(users).where(eq(users.id, rt.userId)).limit(1);
  if (!user) {
    throw notFound('User not found');
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    class: user.class,
  };
}

export async function revokeRefreshToken(token: string) {
  const db = getDb();
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

export async function revokeAllUserTokens(userId: string) {
  const db = getDb();
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function getUserById(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw notFound('User not found');
  }
  return user;
}

export async function getUserAttributes(userId: string) {
  const db = getDb();
  const [attrs] = await db.select().from(characterAttributes).where(eq(characterAttributes.userId, userId)).limit(1);
  return attrs;
}

export async function deleteUser(userId: string) {
  const db = getDb();
  await db.delete(users).where(eq(users.id, userId));
}
