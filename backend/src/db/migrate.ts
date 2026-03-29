import pg from 'pg';
import { config } from '../config.js';

const { Client } = pg;

const MIGRATIONS = [
  {
    name: '001_initial_schema',
    sql: `
      -- Enable extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "postgis";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        oauth_provider VARCHAR(20),
        oauth_id TEXT,
        avatar_url TEXT,
        class VARCHAR(20) NOT NULL DEFAULT 'explorador',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ
      );

      -- Character Attributes
      CREATE TABLE IF NOT EXISTS character_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        vitalidade INT DEFAULT 0 NOT NULL,
        carisma INT DEFAULT 0 NOT NULL,
        inteligencia INT DEFAULT 0 NOT NULL,
        disciplina INT DEFAULT 0 NOT NULL,
        criatividade INT DEFAULT 0 NOT NULL,
        coragem INT DEFAULT 0 NOT NULL,
        total_xp INT DEFAULT 0 NOT NULL,
        level INT DEFAULT 1 NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User Profile
      CREATE TABLE IF NOT EXISTS user_profile (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        habits JSONB,
        interests JSONB,
        goals JSONB,
        personality JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Sponsors
      CREATE TABLE IF NOT EXISTS sponsors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        logo_url TEXT,
        contact_email VARCHAR(255),
        plan VARCHAR(20) DEFAULT 'basic',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Quests
      CREATE TABLE IF NOT EXISTS quests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        pillar VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        validation_type VARCHAR(20) NOT NULL,
        xp_rewards JSONB NOT NULL,
        requirements JSONB,
        location GEOMETRY(Point, 4326),
        location_radius INT,
        sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
        is_ai_generated BOOLEAN DEFAULT FALSE,
        narrative_flavor TEXT,
        status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User Quests
      CREATE TABLE IF NOT EXISTS user_quests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) NOT NULL,
        quest_id UUID REFERENCES quests(id) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        gps_track JSONB,
        validation_data JSONB
      );

      -- Badges
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(80) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        rarity VARCHAR(20) DEFAULT 'comum',
        sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
        event_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User Badges
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) NOT NULL,
        badge_id UUID REFERENCES badges(id) NOT NULL,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      );

      -- Explored Places
      CREATE TABLE IF NOT EXISTS explored_places (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) NOT NULL,
        location GEOMETRY(Point, 4326) NOT NULL,
        address TEXT,
        place_name TEXT,
        first_visited TIMESTAMPTZ DEFAULT NOW(),
        visit_count INT DEFAULT 1,
        xp_earned INT DEFAULT 0
      );

      -- Chat Lobbies
      CREATE TABLE IF NOT EXISTS chat_lobbies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL,
        quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
        max_members INT DEFAULT 6,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      );

      -- Chat Messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lobby_id UUID REFERENCES chat_lobbies(id) NOT NULL,
        user_id UUID REFERENCES users(id) NOT NULL,
        content TEXT NOT NULL,
        moderation_flag BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User Reputation
      CREATE TABLE IF NOT EXISTS user_reputation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
        score INT DEFAULT 100,
        reports_received INT DEFAULT 0,
        bans_count INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Refresh Tokens
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_quests_quest ON user_quests(quest_id);
      CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);
      CREATE INDEX IF NOT EXISTS idx_quests_pillar ON quests(pillar);
      CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
      CREATE INDEX IF NOT EXISTS idx_quests_location ON quests USING GIST(location);
      CREATE INDEX IF NOT EXISTS idx_explored_places_location ON explored_places USING GIST(location);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_lobby ON chat_messages(lobby_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

      -- Migrations tracking table
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
];

async function runMigrations() {
  const client = new Client({ connectionString: config.DATABASE_URL });
  await client.connect();

  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const migration of MIGRATIONS) {
      const result = await client.query(
        'SELECT name FROM _migrations WHERE name = $1',
        [migration.name]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${migration.name}`);
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [migration.name]
        );
        console.log(`Migration ${migration.name} applied.`);
      } else {
        console.log(`Migration ${migration.name} already applied, skipping.`);
      }
    }

    console.log('All migrations complete.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
