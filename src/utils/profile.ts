import type { PlayerRecord, ProfileCardData } from '../types';

export function makeProfileCardData(
  player: PlayerRecord | null | undefined,
  metaLabel: string,
): ProfileCardData | null {
  if (!player || player.empty) {
    return null;
  }

  const fallbackKey = `${player.name}|${player.nickname}|${player.teamTag}|${metaLabel}`;

  return {
    key: player.id || fallbackKey,
    name: player.name,
    nickname: player.nickname || 'No racer tag listed yet.',
    teamTag: player.teamTag || 'No crew tag listed yet.',
    metaLabel,
  };
}
