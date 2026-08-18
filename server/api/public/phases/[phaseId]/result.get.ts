import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
  eventRegistrations,
  phaseBoardScores,
  phaseBoards,
  preselectionCypherParticipants,
  preselectionCyphers,
  registrationCategories,
} from "~~/server/database/schema";

interface ParticipantResult {
  id: number;
  name: string;
  hasScore: boolean;
  rank: number;
}

// No score-based sorting: participants keep their original/natural data
// order (registration/cypher-participant order as returned by the DB
// query). `rank` here is just a plain sequence number, not a ranking by
// score. The raw score value is never exposed on this public route.
function rankResults(
  participants: { id: number; name: string; hasScore: boolean }[],
): ParticipantResult[] {
  return participants.map((participant, index) => ({
    ...participant,
    rank: index + 1,
  }));
}

// Public, read-only status view for a phase: participants are listed in
// their original data order (no score-based ranking) with only a
// `hasScore` boolean, never the raw score value. Mirrors the organizer-only
// `/api/phases/[id]/result.get.ts` cypher breakdown/shape, but skips auth
// and never exposes `participantEmail`, `eventUserId`, or score values (no
// PII/results on public routes). There is no public equivalent of
// `board.post.ts` — scoring stays organizer-only.
export default defineEventHandler(async (event) => {
  const phaseId = getRouterParam(event, "phaseId");
  if (!phaseId) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Phase ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const phaseContext = await db
    .select({
      phaseId: categoryPhases.id,
      categoryId: eventCategories.id,
      eventId: events.id,
    })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(eq(categoryPhases.id, phaseId))
    .then((rows) => rows[0]);

  if (!phaseContext) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

  const board = await db
    .select({ isStarted: phaseBoards.isStarted })
    .from(phaseBoards)
    .where(eq(phaseBoards.phaseId, phaseId))
    .then((rows) => rows[0]);

  const registrations = await db
    .select({
      id: eventRegistrations.id,
      participantName: eventRegistrations.participantName,
    })
    .from(registrationCategories)
    .innerJoin(
      eventRegistrations,
      eq(registrationCategories.registrationId, eventRegistrations.id),
    )
    .where(
      and(
        eq(registrationCategories.categoryId, phaseContext.categoryId),
        eq(eventRegistrations.eventId, phaseContext.eventId),
      ),
    );

  // Only the participant IDs that have a recorded score are needed here —
  // the raw score value is never selected/returned on this public route.
  const scores = await db
    .select({
      participantId: phaseBoardScores.participantId,
    })
    .from(phaseBoardScores)
    .where(eq(phaseBoardScores.phaseId, phaseId));

  const scoredParticipantIds = new Set(
    scores.map((score) => score.participantId),
  );

  const participantById = new Map(
    registrations.map((registration) => [
      registration.id,
      {
        id: registration.id,
        name: registration.participantName,
        hasScore: scoredParticipantIds.has(registration.id),
      },
    ]),
  );

  // Cypher breakdown: every preselection phase has one row per cypher in
  // `preselection_cyphers`, each carrying its assigned judges and, via
  // `preselection_cypher_participants`, the participants shuffled into it
  // at phase creation time. Sequence-numbered in original order within
  // each cypher group (no score-based ranking).
  const cypherRows = await db
    .select({
      cypherId: preselectionCyphers.id,
      cypherIndex: preselectionCyphers.cypherIndex,
      judges: preselectionCyphers.judges,
    })
    .from(preselectionCyphers)
    .where(eq(preselectionCyphers.phaseId, phaseId));

  const cypherParticipantRows =
    cypherRows.length > 0
      ? await db
          .select({
            cypherId: preselectionCypherParticipants.cypherId,
            registrationId: preselectionCypherParticipants.registrationId,
          })
          .from(preselectionCypherParticipants)
          .innerJoin(
            preselectionCyphers,
            eq(
              preselectionCypherParticipants.cypherId,
              preselectionCyphers.id,
            ),
          )
          .where(eq(preselectionCyphers.phaseId, phaseId))
      : [];

  const registrationIdsByCypherId = new Map<string, number[]>();
  for (const row of cypherParticipantRows) {
    const list = registrationIdsByCypherId.get(row.cypherId) ?? [];
    list.push(row.registrationId);
    registrationIdsByCypherId.set(row.cypherId, list);
  }

  const cyphers = cypherRows
    .sort((a, b) => a.cypherIndex - b.cypherIndex)
    .map((cypher) => {
      const registrationIds =
        registrationIdsByCypherId.get(cypher.cypherId) ?? [];
      const participants = registrationIds
        .map((registrationId) => participantById.get(registrationId))
        .filter((participant): participant is NonNullable<typeof participant> =>
          Boolean(participant),
        );

      return {
        id: cypher.cypherId,
        index: cypher.cypherIndex,
        judges: cypher.judges,
        results: rankResults(participants),
      };
    });

  // Flat fallback list across all registrations, sequence-numbered in
  // original order — used when the phase has no cypher breakdown (e.g.
  // non-preselection phase types).
  const results = rankResults(Array.from(participantById.values()));

  return {
    success: true,
    isPhaseStarted: board?.isStarted ?? false,
    cyphers,
    results,
  };
});
