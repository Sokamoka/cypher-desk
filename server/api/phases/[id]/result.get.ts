import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  phaseBoardScores,
  preselectionCypherParticipants,
  preselectionCyphers,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

interface ParticipantResult {
  id: number;
  name: string;
  score: number | null;
  rank: number;
}

// Highest score first; participants without a score yet are pushed to the
// bottom, ordered alphabetically among themselves.
function rankResults(
  participants: { id: number; name: string; score: number | null }[],
): ParticipantResult[] {
  return [...participants]
    .sort((a, b) => {
      if (a.score === null && b.score === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    })
    .map((participant, index) => ({ ...participant, rank: index + 1 }));
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const phaseId = getRouterParam(event, "id");
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
      phaseName: categoryPhases.name,
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      eventId: events.id,
      eventTitle: events.title,
      eventUserId: events.userId,
    })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(eq(categoryPhases.id, phaseId))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner of the event this phase belongs
  // to may view its results. Return 404 (not 403) to avoid leaking
  // existence of the phase to a non-owner.
  if (!phaseContext || phaseContext.eventUserId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

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

  const scores = await db
    .select({
      participantId: phaseBoardScores.participantId,
      sliderValue: phaseBoardScores.sliderValue,
    })
    .from(phaseBoardScores)
    .where(eq(phaseBoardScores.phaseId, phaseId));

  const scoreByParticipantId = new Map(
    scores.map((score) => [score.participantId, score.sliderValue]),
  );

  const participantById = new Map(
    registrations.map((registration) => [
      registration.id,
      {
        id: registration.id,
        name: registration.participantName,
        score: scoreByParticipantId.get(registration.id) ?? null,
      },
    ]),
  );

  // Cypher breakdown: every preselection phase has one row per cypher in
  // `preselection_cyphers`, each carrying its assigned judges and, via
  // `preselection_cypher_participants`, the participants shuffled into it
  // at phase creation time. Rank independently within each cypher group.
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

  // Flat fallback ranking across all registrations — used when the phase
  // has no cypher breakdown (e.g. non-preselection phase types).
  const results = rankResults(Array.from(participantById.values()));

  return {
    success: true,
    event: {
      id: phaseContext.eventId,
      title: phaseContext.eventTitle,
    },
    category: {
      id: phaseContext.categoryId,
      name: phaseContext.categoryName,
    },
    phase: {
      id: phaseContext.phaseId,
      name: phaseContext.phaseName,
    },
    cyphers,
    results,
  };
});
