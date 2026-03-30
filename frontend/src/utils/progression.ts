export function calculateLevel(totalXp: number): number {
  return Math.floor(1 + Math.sqrt(totalXp / 100));
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100;
}
