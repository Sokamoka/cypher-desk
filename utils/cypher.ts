// Shared helper for randomly distributing participants across cypher
// groups. Used both as a client-side preview in `PreselectionForm.vue` and
// mirrored server-side (the authoritative split) when a preselection phase
// is created.

/**
 * Returns a new array with the same elements as `items`, shuffled using the
 * Fisher-Yates algorithm.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled;
}

/**
 * Randomly shuffles `participants` and splits them into `numberOfCypher`
 * groups, as evenly sized as possible (difference of at most 1 between the
 * largest and smallest group).
 */
export function shuffleParticipants<T>(
  participants: T[],
  numberOfCypher: number,
): T[][] {
  const groups: T[][] = Array.from({ length: numberOfCypher }, () => []);

  shuffleArray(participants).forEach((participant, index) => {
    groups[index % numberOfCypher]!.push(participant);
  });

  return groups;
}
