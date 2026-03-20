import type { PlayerRecord, ProfileCardData } from '../types';

export function makeProfileCardData(
  player: PlayerRecord | null | undefined,
  metaLabel: string,
): ProfileCardData | null {
  if (!player || player.empty) {
    return null;
  }

  const fallbackKey = `${player.name}|${player.aura}|${player.unitNumber}|${metaLabel}`;

  return {
    key: player.id || fallbackKey,
    name: player.name,
    aura: player.aura || 'No aura listed yet.',
    unitNumber: player.unitNumber || 'No unit number listed yet.',
    metaLabel,
  };
}
