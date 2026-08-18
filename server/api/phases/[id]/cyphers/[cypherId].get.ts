import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  phaseBoards,
  preselectionCypherParticipants,
  preselectionCyphers,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const phaseId = getRouterParam(event, "id");
  const cypherId = getRouterParam(event, "cypherId");
  if (!phaseId || !cypherId) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: "Phase ID and cypher ID are required",
      }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const cypherContext = await db
    .select({
      cypherId: preselectionCyphers.id,
      cypherIndex: preselectionCyphers.cypherIndex,
      cypherPhaseId: preselectionCyphers.phaseId,
      judgesRaw: sql<string>`${preselectionCyphers.judges}`.as(
        "cypher_judges_raw",
      ),
      phaseId: categoryPhases.id,
      phaseType: categoryPhases.type,
      phaseName: categoryPhases.name,
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      eventId: events.id,
      eventTitle: events.title,
      eventUserId: events.userId,
    })
    .from(preselectionCyphers)
    .innerJoin(
      categoryPhases,
      eq(preselectionCyphers.phaseId, categoryPhases.id),
    )
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(eq(preselectionCyphers.id, cypherId))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner of the event this cypher belongs
  // to may view it. Also verify the cypher actually belongs to the
  // requested phase. Return 404 (not 403) to avoid leaking existence.
  if (
    !cypherContext ||
    cypherContext.eventUserId !== user.id ||
    cypherContext.cypherPhaseId !== phaseId
  ) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Cypher not found" }),
    );
  }

  const board = await db
    .select({ isStarted: phaseBoards.isStarted })
    .from(phaseBoards)
    .where(eq(phaseBoards.phaseId, phaseId))
    .then((rows) => rows[0]);

  const participants = await db
    .select({
      id: eventRegistrations.id,
      participantName: eventRegistrations.participantName,
    })
    .from(preselectionCypherParticipants)
    .innerJoin(
      eventRegistrations,
      eq(preselectionCypherParticipants.registrationId, eventRegistrations.id),
    )
    .where(eq(preselectionCypherParticipants.cypherId, cypherId));

  return {
    success: true,
    event: {
      id: cypherContext.eventId,
      title: cypherContext.eventTitle,
    },
    category: {
      id: cypherContext.categoryId,
      name: cypherContext.categoryName,
    },
    phase: {
      id: cypherContext.phaseId,
      type: cypherContext.phaseType,
      name: cypherContext.phaseName,
    },
    isPhaseStarted: board?.isStarted ?? false,
    cypher: {
      id: cypherContext.cypherId,
      cypherIndex: cypherContext.cypherIndex,
      judges: JSON.parse(cypherContext.judgesRaw) as string[],
    },
    participants,
  };
});
