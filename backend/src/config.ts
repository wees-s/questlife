import { z } from 'zod';

const envSchema = z.object({
  OFFLINE_MODE: z.string().default('false').transform(v => v === 'true'),
  DATABASE_URL: z.string().default('postgresql://lifequest:lifequest_dev@localhost:5432/lifequest'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
  ANTHROPIC_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  MAPBOX_SECRET_TOKEN: z.string().default(''),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = envSchema.parse(process.env);

export type Config = typeof config;
