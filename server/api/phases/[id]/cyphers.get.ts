import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
  phaseBoards,
  preselectionCypherParticipants,
  preselectionCyphers,
  preselectionPhases,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { parseEventJudges } from "~~/server/utils/event-judges";

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
      phaseType: categoryPhases.type,
      phaseName: categoryPhases.name,
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      eventId: events.id,
      eventTitle: events.title,
      eventJudgesRaw: sql<string>`${events.judges}`.as("event_judges_raw"),
      eventUserId: events.userId,
      numberOfCypher: preselectionPhases.numberOfCypher,
      groupSize: preselectionPhases.groupSize,
    })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .leftJoin(
      preselectionPhases,
      eq(preselectionPhases.phaseId, categoryPhases.id),
    )
    .where(eq(categoryPhases.id, phaseId))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner of the event this phase belongs
  // to may view its cyphers. Return 404 (not 403) to avoid leaking
  // existence.
  if (!phaseContext || phaseContext.eventUserId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

  // Cyphers (and their per-cypher judge assignments) only exist for
  // `preselection`-type phases.
  if (phaseContext.phaseType !== "preselection") {
    return sendError(
      event,
      createError({
        statusCode: 404,
        message: "This phase type has no cyphers",
      }),
    );
  }

  const board = await db
    .select({ isStarted: phaseBoards.isStarted })
    .from(phaseBoards)
    .where(eq(phaseBoards.phaseId, phaseId))
    .then((rows) => rows[0]);

  const cypherRows = await db
    .select({
      id: preselectionCyphers.id,
      cypherIndex: preselectionCyphers.cypherIndex,
      judgesRaw: sql<string>`${preselectionCyphers.judges}`.as(
        "cypher_judges_raw",
      ),
    })
    .from(preselectionCyphers)
    .where(eq(preselectionCyphers.phaseId, phaseId));

  const participantCounts = await db
    .select({
      cypherId: preselectionCypherParticipants.cypherId,
      count: sql<number>`count(*)`.as("participant_count"),
    })
    .from(preselectionCypherParticipants)
    .innerJoin(
      preselectionCyphers,
      eq(preselectionCypherParticipants.cypherId, preselectionCyphers.id),
    )
    .where(eq(preselectionCyphers.phaseId, phaseId))
    .groupBy(preselectionCypherParticipants.cypherId);

  const participantCountByCypherId = new Map(
    participantCounts.map((row) => [row.cypherId, row.count]),
  );

  const cyphers = cypherRows
    .map((row) => ({
      id: row.id,
      cypherIndex: row.cypherIndex,
      judges: JSON.parse(row.judgesRaw) as string[],
      participantCount: participantCountByCypherId.get(row.id) ?? 0,
    }))
    .sort((a, b) => a.cypherIndex - b.cypherIndex);

  return {
    success: true,
    event: {
      id: phaseContext.eventId,
      title: phaseContext.eventTitle,
      judges: parseEventJudges(phaseContext.eventJudgesRaw),
    },
    category: {
      id: phaseContext.categoryId,
      name: phaseContext.categoryName,
    },
    phase: {
      id: phaseContext.phaseId,
      type: phaseContext.phaseType,
      name: phaseContext.phaseName,
      preselection:
        phaseContext.numberOfCypher !== null && phaseContext.groupSize !== null
          ? {
              numberOfCypher: phaseContext.numberOfCypher,
              groupSize: phaseContext.groupSize,
            }
          : null,
    },
    isPhaseStarted: board?.isStarted ?? false,
    cyphers,
  };
});
