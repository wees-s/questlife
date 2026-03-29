import pg from 'pg';
import { config } from '../config.js';

const { Client } = pg;

const SEED_QUESTS = [
  {
    title: 'Caminhada do Despertar',
    description: 'Caminhe 2km pelo seu bairro. O guerreiro que conhece seu terreno jamais se perde.',
    pillar: 'corpo',
    type: 'daily',
    validation_type: 'gps',
    xp_rewards: JSON.stringify({ vitalidade: 15, disciplina: 5, total: 20 }),
    requirements: JSON.stringify({ distance_meters: 2000 }),
    narrative_flavor: 'Os ventos da QuestCity sopram ao seu favor. O caminho se revela a quem caminha.',
  },
  {
    title: 'Corrida do Explorador',
    description: 'Corra 3km. Sinta a cidade pulsar sob seus pés.',
    pillar: 'corpo',
    type: 'daily',
    validation_type: 'gps',
    xp_rewards: JSON.stringify({ vitalidade: 25, coragem: 10, disciplina: 5, total: 40 }),
    requirements: JSON.stringify({ distance_meters: 3000 }),
    narrative_flavor: 'Apenas os mais ágeis podem decifrar os segredos escondidos nas ruas da cidade.',
  },
  {
    title: 'Meditação do Sábio',
    description: 'Medite por 10 minutos. Acalme a mente e encontre clareza interior.',
    pillar: 'mente',
    type: 'daily',
    validation_type: 'timer',
    xp_rewards: JSON.stringify({ inteligencia: 10, disciplina: 8, total: 18 }),
    requirements: JSON.stringify({ duration_seconds: 600 }),
    narrative_flavor: 'Na biblioteca silenciosa de QuestCity, os sábios encontram respostas nas pausas entre pensamentos.',
  },
  {
    title: 'Foco Absoluto',
    description: 'Estude ou trabalhe focado por 25 minutos sem interrupções.',
    pillar: 'mente',
    type: 'daily',
    validation_type: 'timer',
    xp_rewards: JSON.stringify({ inteligencia: 15, disciplina: 10, criatividade: 5, total: 30 }),
    requirements: JSON.stringify({ duration_seconds: 1500 }),
    narrative_flavor: 'Os pergaminhos antigos só revelam seu conteúdo a quem dedica tempo verdadeiro.',
  },
  {
    title: 'Conversa de Taverna',
    description: 'Participe de um lobby de chat por 5 minutos e envie pelo menos 8 mensagens.',
    pillar: 'social',
    type: 'daily',
    validation_type: 'chat',
    xp_rewards: JSON.stringify({ carisma: 12, coragem: 5, total: 17 }),
    requirements: JSON.stringify({ min_duration_seconds: 300, min_messages: 8 }),
    narrative_flavor: 'A taverna de QuestCity ferve de histórias. Qual será a sua?',
  },
  {
    title: 'Duelo de Palavras',
    description: 'Tenha uma conversa 1-a-1 com outro aventureiro. Ambos devem participar ativamente.',
    pillar: 'social',
    type: 'daily',
    validation_type: 'chat',
    xp_rewards: JSON.stringify({ carisma: 15, coragem: 10, total: 25 }),
    requirements: JSON.stringify({ min_duration_seconds: 300, min_messages: 10, lobby_type: 'direct' }),
    narrative_flavor: 'Dois guerreiros se encontram na praça. Não com espadas, mas com palavras.',
  },
  {
    title: 'Maratona Semanal',
    description: 'Acumule 15km de caminhada ou corrida durante a semana.',
    pillar: 'corpo',
    type: 'weekly',
    validation_type: 'gps',
    xp_rewards: JSON.stringify({ vitalidade: 50, disciplina: 20, coragem: 10, total: 80 }),
    requirements: JSON.stringify({ distance_meters: 15000 }),
    narrative_flavor: 'Apenas os verdadeiros atletas de QuestCity completam o circuito sagrado.',
  },
  {
    title: 'Semana do Conhecimento',
    description: 'Acumule 3 horas de estudo ou foco durante a semana.',
    pillar: 'mente',
    type: 'weekly',
    validation_type: 'timer',
    xp_rewards: JSON.stringify({ inteligencia: 40, disciplina: 30, criatividade: 10, total: 80 }),
    requirements: JSON.stringify({ duration_seconds: 10800 }),
    narrative_flavor: 'A Academia de QuestCity só aceita os que provam dedicação constante.',
  },
];

async function seed() {
  const client = new Client({ connectionString: config.DATABASE_URL });
  await client.connect();

  try {
    // Check if quests already seeded
    const existing = await client.query('SELECT COUNT(*) FROM quests WHERE is_ai_generated = false');
    if (Number(existing.rows[0].count) > 0) {
      console.log('Seed quests already exist, skipping.');
      return;
    }

    for (const quest of SEED_QUESTS) {
      await client.query(
        `INSERT INTO quests (title, description, pillar, type, validation_type, xp_rewards, requirements, narrative_flavor, is_ai_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
        [
          quest.title,
          quest.description,
          quest.pillar,
          quest.type,
          quest.validation_type,
          quest.xp_rewards,
          quest.requirements,
          quest.narrative_flavor,
        ]
      );
    }

    console.log(`Seeded ${SEED_QUESTS.length} quests.`);
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
