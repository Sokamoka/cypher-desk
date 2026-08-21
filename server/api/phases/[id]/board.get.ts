import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  cypherJudgeScores,
  eventCategories,
  events,
  eventRegistrations,
  phaseBoards,
  phaseBoardScores,
  preselectionCypherParticipants,
  preselectionCyphers,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

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
      categoryId: eventCategories.id,
      eventId: events.id,
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
  // to may view its board. Return 404 (not 403) to avoid leaking existence.
  if (!phaseContext || phaseContext.eventUserId !== user.id) {
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

  const participants = registrations.map((registration) => {
    const savedValue = scoreByParticipantId.get(registration.id) ?? null;
    return {
      id: registration.id,
      name: registration.participantName,
      sliderValue: savedValue ?? 5,
      savedValue,
      isSaved: savedValue !== null,
    };
  });

  const participantNameById = new Map(
    registrations.map((registration) => [
      registration.id,
      registration.participantName,
    ]),
  );

  // Cypher breakdown: mirrors the query pattern in
  // `server/api/phases/[id]/result.get.ts`, but here we surface every
  // assigned judge's *own* score per participant (not the averaged one)
  // so the organizer can review and edit each judge's individual entry.
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

  const cypherIds = cypherRows.map((cypher) => cypher.cypherId);
  const judgeScoreRows =
    cypherIds.length > 0
      ? await db
          .select({
            cypherId: cypherJudgeScores.cypherId,
            judgeName: cypherJudgeScores.judgeName,
            participantId: cypherJudgeScores.participantId,
            sliderValue: cypherJudgeScores.sliderValue,
          })
          .from(cypherJudgeScores)
          .where(inArray(cypherJudgeScores.cypherId, cypherIds))
      : [];

  const judgeScoreByKey = new Map<string, number>();
  for (const row of judgeScoreRows) {
    judgeScoreByKey.set(
      `${row.cypherId}:${row.participantId}:${row.judgeName}`,
      row.sliderValue,
    );
  }

  const cyphers = cypherRows
    .sort((a, b) => a.cypherIndex - b.cypherIndex)
    .map((cypher) => {
      const registrationIds =
        registrationIdsByCypherId.get(cypher.cypherId) ?? [];

      const cypherParticipants = registrationIds
        .map((registrationId) => {
          const name = participantNameById.get(registrationId);
          if (!name) return undefined;

          const scores = Object.fromEntries(
            cypher.judges.map((judgeName) => [
              judgeName,
              judgeScoreByKey.get(
                `${cypher.cypherId}:${registrationId}:${judgeName}`,
              ) ?? null,
            ]),
          );

          return { id: registrationId, name, scores };
        })
        .filter(
          (participant): participant is NonNullable<typeof participant> =>
            Boolean(participant),
        );

      return {
        id: cypher.cypherId,
        index: cypher.cypherIndex,
        judges: cypher.judges,
        participants: cypherParticipants,
      };
    });

  return {
    success: true,
    isPhaseStarted: board?.isStarted ?? false,
    participants,
    cyphers,
  };
});
