import { and, eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  cypherJudgeScores,
  eventRegistrations,
  preselectionCypherParticipants,
} from "~~/server/database/schema";

export interface CypherGroupParticipant {
  id: number;
  participantName: string;
}

/**
 * Returns every participant assigned to a cypher, ordered deterministically
 * by their registration id. This ordering is the single source of truth for
 * how participants are chunked into `groupSize` groups — both the GET and
 * POST score endpoints must use this same helper so the client and server
 * always agree on which participants belong to which group/step.
 */
export async function getOrderedParticipants(
  db: DrizzleD1Database,
  cypherId: string,
): Promise<CypherGroupParticipant[]> {
  return db
    .select({
      id: eventRegistrations.id,
      participantName: eventRegistrations.participantName,
    })
    .from(preselectionCypherParticipants)
    .innerJoin(
      eventRegistrations,
      eq(preselectionCypherParticipants.registrationId, eventRegistrations.id),
    )
    .where(eq(preselectionCypherParticipants.cypherId, cypherId))
    .orderBy(eventRegistrations.id);
}

/**
 * Chunks an ordered list of participants into fixed-size groups of
 * `groupSize`. The final group may be smaller if the participant count
 * isn't evenly divisible. `groupSize` is clamped to at least 1 to avoid an
 * infinite loop / division by zero if a phase was ever misconfigured.
 */
export function chunkIntoGroups<T>(items: T[], groupSize: number): T[][] {
  const size = Math.max(1, groupSize);
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export interface GroupCompletion {
  /** True once every assigned judge has scored every participant in this group. */
  isComplete: boolean;
  /** Assigned judges who still have at least one un-scored participant in this group. */
  pendingJudges: string[];
}

/**
 * For each group, determines whether every judge assigned to the cypher has
 * saved a score for every participant in that group, and which judges are
 * still pending. `scores` is the full set of `cypherJudgeScores` rows for
 * the cypher (all judges, all participants) so this can be computed
 * in-memory without extra round trips per group.
 */
export function computeGroupCompletion(
  groups: CypherGroupParticipant[][],
  assignedJudges: string[],
  scores: { judgeName: string; participantId: number }[],
): GroupCompletion[] {
  // Set of "judgeName::participantId" pairs that have been scored, for O(1)
  // lookups while walking each group/judge combination below.
  const scoredPairs = new Set(
    scores.map((score) => `${score.judgeName}::${score.participantId}`),
  );

  return groups.map((group) => {
    const pendingJudges = assignedJudges.filter((judgeName) =>
      group.some(
        (participant) =>
          !scoredPairs.has(`${judgeName}::${participant.id}`),
      ),
    );

    return {
      isComplete: pendingJudges.length === 0,
      pendingJudges,
    };
  });
}

/**
 * The "current step" for a cypher is the index of the first group that
 * isn't yet fully scored by every assigned judge. If every group is
 * complete, this returns `groups.length` (i.e. one past the last group),
 * signaling that judging for this cypher is finished.
 */
export function computeCurrentStepIndex(
  groupsCompletion: GroupCompletion[],
): number {
  const firstIncompleteIndex = groupsCompletion.findIndex(
    (group) => !group.isComplete,
  );
  return firstIncompleteIndex === -1
    ? groupsCompletion.length
    : firstIncompleteIndex;
}

/**
 * Convenience helper bundling the full derivation pipeline: fetch ordered
 * participants for the cypher, chunk them into groups, fetch every judge's
 * scores for the cypher, and compute per-group completion + the current
 * step index. Used by both the GET (initial load) and POST (post-save
 * recompute + broadcast) score endpoints so the logic stays in one place.
 */
export async function getCypherGroupsState(
  db: DrizzleD1Database,
  cypherId: string,
  assignedJudges: string[],
  groupSize: number,
) {
  const participants = await getOrderedParticipants(db, cypherId);
  const groups = chunkIntoGroups(participants, groupSize);

  const scores =
    participants.length === 0
      ? []
      : await db
          .select({
            judgeName: cypherJudgeScores.judgeName,
            participantId: cypherJudgeScores.participantId,
          })
          .from(cypherJudgeScores)
          .where(
            and(
              eq(cypherJudgeScores.cypherId, cypherId),
              inArray(
                cypherJudgeScores.participantId,
                participants.map((participant) => participant.id),
              ),
            ),
          );

  const groupsCompletion = computeGroupCompletion(
    groups,
    assignedJudges,
    scores,
  );
  const currentStepIndex = computeCurrentStepIndex(groupsCompletion);

  return {
    participants,
    groups,
    groupsCompletion,
    currentStepIndex,
    totalSteps: groups.length,
  };
}
