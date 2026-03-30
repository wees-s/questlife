import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================
// USERS
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash'),
  oauthProvider: varchar('oauth_provider', { length: 20 }),
  oauthId: text('oauth_id'),
  avatarUrl: text('avatar_url'),
  class: varchar('class', { length: 20 }).notNull().default('explorador'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

// ============================================================
// CHARACTER ATTRIBUTES
// ============================================================

export const characterAttributes = pgTable('character_attributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vitalidade: integer('vitalidade').default(0).notNull(),
  carisma: integer('carisma').default(0).notNull(),
  inteligencia: integer('inteligencia').default(0).notNull(),
  disciplina: integer('disciplina').default(0).notNull(),
  criatividade: integer('criatividade').default(0).notNull(),
  coragem: integer('coragem').default(0).notNull(),
  totalXp: integer('total_xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// USER PROFILE
// ============================================================

export const userProfile = pgTable('user_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  habits: jsonb('habits'),
  interests: jsonb('interests'),
  goals: jsonb('goals'),
  personality: jsonb('personality'),
  // embedding VECTOR(1536) — added via raw SQL migration for pgvector
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// SPONSORS
// ============================================================

export const sponsors = pgTable('sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  logoUrl: text('logo_url'),
  contactEmail: varchar('contact_email', { length: 255 }),
  plan: varchar('plan', { length: 20 }).default('basic'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// QUESTS
// ============================================================

export const quests = pgTable('quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description').notNull(),
  pillar: varchar('pillar', { length: 20 }).notNull(), // 'corpo' | 'mente' | 'social'
  type: varchar('type', { length: 20 }).notNull(), // 'daily' | 'weekly' | 'epic' | 'sponsored'
  validationType: varchar('validation_type', { length: 20 }).notNull(), // 'gps' | 'timer' | 'chat' | 'manual'
  xpRewards: jsonb('xp_rewards').notNull(),
  requirements: jsonb('requirements'),
  // location GEOMETRY(Point, 4326) — added via raw SQL migration for PostGIS
  locationRadius: integer('location_radius'),
  sponsorId: uuid('sponsor_id').references(() => sponsors.id, { onDelete: 'set null' }),
  isAiGenerated: boolean('is_ai_generated').default(false),
  narrativeFlavor: text('narrative_flavor'),
  status: varchar('status', { length: 20 }).default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// USER QUESTS
// ============================================================

export const userQuests = pgTable('user_quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  questId: uuid('quest_id').references(() => quests.id).notNull(),
  status: varchar('status', { length: 20 }).default('active'), // 'active' | 'completed' | 'failed' | 'expired'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  gpsTrack: jsonb('gps_track'),
  validationData: jsonb('validation_data'),
});

// ============================================================
// BADGES
// ============================================================

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  rarity: varchar('rarity', { length: 20 }).default('comum'), // 'comum' | 'raro' | 'epico' | 'lendario'
  sponsorId: uuid('sponsor_id').references(() => sponsors.id, { onDelete: 'set null' }),
  eventId: uuid('event_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// USER BADGES
// ============================================================

export const userBadges = pgTable('user_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  badgeId: uuid('badge_id').references(() => badges.id).notNull(),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('user_badges_unique').on(table.userId, table.badgeId),
]);

// ============================================================
// EXPLORED PLACES
// ============================================================

export const exploredPlaces = pgTable('explored_places', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  // location GEOMETRY(Point, 4326) — added via raw SQL migration
  address: text('address'),
  placeName: text('place_name'),
  firstVisited: timestamp('first_visited', { withTimezone: true }).defaultNow(),
  visitCount: integer('visit_count').default(1),
  xpEarned: integer('xp_earned').default(0),
});

// ============================================================
// CHAT LOBBIES
// ============================================================

export const chatLobbies = pgTable('chat_lobbies', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(), // 'general' | 'direct' | 'group'
  questId: uuid('quest_id').references(() => quests.id, { onDelete: 'set null' }),
  maxMembers: integer('max_members').default(6),
  status: varchar('status', { length: 20 }).default('active'), // 'active' | 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

// ============================================================
// CHAT MESSAGES
// ============================================================

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  lobbyId: uuid('lobby_id').references(() => chatLobbies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  moderationFlag: boolean('moderation_flag').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// USER REPUTATION
// ============================================================

export const userReputation = pgTable('user_reputation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  score: integer('score').default(100),
  reportsReceived: integer('reports_received').default(0),
  bansCount: integer('bans_count').default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// REFRESH TOKENS
// ============================================================

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
