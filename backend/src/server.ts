import { config } from './config.js';

async function start() {
  let app;

  if (config.OFFLINE_MODE) {
    console.log('Starting in OFFLINE mode (no external dependencies required)...');
    const { buildOfflineApp } = await import('./offline/offlineApp.js');
    app = await buildOfflineApp();
  } else {
    const { buildApp } = await import('./app.js');
    app = await buildApp();
  }

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`
╔═══════════════════════════════════════════════╗
║         LifeQuest API Server                  ║
║  Port: ${String(config.PORT).padEnd(39)}║
║  Mode: ${(config.OFFLINE_MODE ? 'OFFLINE (no DB/Redis)' : config.NODE_ENV).padEnd(39)}║
║  Health: http://localhost:${config.PORT}/api/v1/health${' '.repeat(2)}║
╚═══════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
