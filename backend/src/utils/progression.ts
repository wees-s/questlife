// Level calculation based on total XP
export function calculateLevel(totalXp: number): number {
  return Math.floor(1 + Math.sqrt(totalXp / 100));
}

// XP needed for the next level
export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100;
}

// Class XP multipliers
export const CLASS_MULTIPLIERS: Record<string, Record<string, number>> = {
  explorador: { vitalidade: 1.2, coragem: 1.2 },
  academico: { inteligencia: 1.2, disciplina: 1.2 },
  atleta: { vitalidade: 1.2, disciplina: 1.2 },
  social: { carisma: 1.2, coragem: 1.2 },
  criador: { criatividade: 1.2, inteligencia: 1.2 },
};

// Attribute unlocks
export const ATTRIBUTE_UNLOCKS = {
  vitalidade: [
    { level: 10, skill: 'Corredor', bonus: '+10% XP em quests de corrida' },
    { level: 25, skill: 'Atleta Urbano', bonus: 'Quests de distância contam dobro' },
    { level: 50, skill: 'Maratonista', bonus: 'Desbloqueio de quests épicas de corpo' },
  ],
  carisma: [
    { level: 10, skill: 'Conversador', bonus: '+5 XP bônus em quests sociais' },
    { level: 25, skill: 'Conector', bonus: 'Desbloqueia lobbies VIP' },
    { level: 50, skill: 'Líder Natural', bonus: 'Pode criar lobbies customizados' },
  ],
  inteligencia: [
    { level: 10, skill: 'Estudante', bonus: '+10% XP em quests de foco' },
    { level: 25, skill: 'Erudito', bonus: 'Quests de estudo dão bônus de criatividade' },
    { level: 50, skill: 'Sábio', bonus: 'Desbloqueio de quests épicas de mente' },
  ],
  disciplina: [
    { level: 10, skill: 'Consistente', bonus: '+5% XP em todas as quests diárias' },
    { level: 25, skill: 'Inabalável', bonus: 'Streak semanal dá bônus 2x' },
    { level: 50, skill: 'Mestre da Rotina', bonus: 'Desbloqueio de quests épicas de disciplina' },
  ],
  criatividade: [
    { level: 10, skill: 'Curioso', bonus: '+10% XP ao explorar lugares novos' },
    { level: 25, skill: 'Artista', bonus: 'Personagem ganha animações únicas' },
    { level: 50, skill: 'Visionário', bonus: 'Pode sugerir quests para a comunidade' },
  ],
  coragem: [
    { level: 10, skill: 'Aventureiro', bonus: '+10% XP em quests novas' },
    { level: 25, skill: 'Destemido', bonus: 'Quests difíceis dão bônus extra' },
    { level: 50, skill: 'Lendário', bonus: 'Desbloqueio de quests épicas de coragem' },
  ],
};

// Apply XP rewards with class multiplier
export function applyXpRewards(
  rewards: Record<string, number>,
  userClass: string,
): Record<string, number> {
  const multipliers = CLASS_MULTIPLIERS[userClass] || {};
  const result: Record<string, number> = {};
  let total = 0;

  for (const [attr, value] of Object.entries(rewards)) {
    if (attr === 'total') continue;
    const multiplier = multipliers[attr] || 1.0;
    const adjusted = Math.round(value * multiplier);
    result[attr] = adjusted;
    total += adjusted;
  }

  result.total = total;
  return result;
}
