import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  preselectionCypherParticipants,
  preselectionCyphers,
  preselectionPhases,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { parseEventJudges } from "~~/server/utils/event-judges";
import { createPreselectionPhaseSchema } from "~~/utils/schemas";
import { shuffleParticipants } from "~~/utils/cypher";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const eventId = getRouterParam(event, "id");
  if (!eventId) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Event ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const eventData = await db
    .select({
      id: events.id,
      userId: events.userId,
      judgesRaw: sql<string>`${events.judges}`.as("event_judges_raw"),
    })
    .from(events)
    .where(eq(events.id, eventId))
    .then((rows) => rows[0]);

  if (!eventData || eventData.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  try {
    const eventJudges = parseEventJudges(eventData.judgesRaw);
    const judgeNames = new Set(eventJudges.map((judge) => judge.name));

    const body = await readBody(event);
    const validatedData = v.parse(
      createPreselectionPhaseSchema(eventJudges.length),
      body,
    );

    // Defense-in-depth: never trust client-supplied judge names blindly —
    // every selected judge must actually belong to this event.
    const hasUnknownJudge = validatedData.cyphers.some((cypher) =>
      cypher.judges.some((judgeName) => !judgeNames.has(judgeName)),
    );
    if (hasUnknownJudge) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Invalid judge selection",
        }),
      );
    }

    const category = await db
      .select({ id: eventCategories.id })
      .from(eventCategories)
      .where(
        and(
          eq(eventCategories.id, validatedData.categoryId),
          eq(eventCategories.eventId, eventId),
        ),
      )
      .then((rows) => rows[0]);

    if (!category) {
      return sendError(
        event,
        createError({ statusCode: 400, message: "Invalid category selection" }),
      );
    }

    const phaseId = `phase_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await db.insert(categoryPhases).values({
      id: phaseId,
      categoryId: validatedData.categoryId,
      type: "preselection",
      name: validatedData.name,
    });

    await db.insert(preselectionPhases).values({
      phaseId,
      numberOfCypher: validatedData.numberOfCypher,
      groupSize: validatedData.groupSize,
    });

    const categoryRegistrations = await db
      .select({
        id: eventRegistrations.id,
        participantName: eventRegistrations.participantName,
        participantEmail: eventRegistrations.participantEmail,
        createdAt: eventRegistrations.createdAt,
      })
      .from(registrationCategories)
      .innerJoin(
        eventRegistrations,
        eq(registrationCategories.registrationId, eventRegistrations.id),
      )
      .where(
        and(
          eq(registrationCategories.categoryId, validatedData.categoryId),
          eq(eventRegistrations.eventId, eventId),
        ),
      );

    // Randomly shuffle & split participants as evenly as possible across
    // `numberOfCypher` groups, then persist each cypher's judges and its
    // assigned participants.
    const participantGroups = shuffleParticipants(
      categoryRegistrations,
      validatedData.numberOfCypher,
    );

    const cyphers = [];
    const cypherParticipantRows: { cypherId: string; registrationId: number }[] =
      [];

    for (let index = 0; index < validatedData.numberOfCypher; index++) {
      const cypherId = `cypher_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`;
      const cypherJudges = validatedData.cyphers[index]?.judges ?? [];
      const participants = participantGroups[index] ?? [];

      cyphers.push({
        id: cypherId,
        index: index + 1,
        judges: cypherJudges,
        participants,
      });

      for (const participant of participants) {
        cypherParticipantRows.push({
          cypherId,
          registrationId: participant.id,
        });
      }
    }

    if (cyphers.length > 0) {
      await db.insert(preselectionCyphers).values(
        cyphers.map((cypher) => ({
          id: cypher.id,
          phaseId,
          cypherIndex: cypher.index,
          judges: cypher.judges,
        })),
      );
    }

    if (cypherParticipantRows.length > 0) {
      await db.insert(preselectionCypherParticipants).values(
        cypherParticipantRows.map((row) => ({
          cypherId: row.cypherId,
          registrationId: row.registrationId,
        })),
      );
    }

    return {
      success: true,
      phase: {
        id: phaseId,
        type: "preselection",
        name: validatedData.name,
        categoryId: validatedData.categoryId,
        preselection: {
          numberOfCypher: validatedData.numberOfCypher,
          groupSize: validatedData.groupSize,
          categoryRegistrations,
          cyphers: cyphers.map((cypher) => ({
            id: cypher.id,
            index: cypher.index,
            judges: cypher.judges,
            participants: cypher.participants,
          })),
        },
      },
    };
  } catch (error) {
    if (error instanceof v.ValiError) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Validation failed",
          data: error.issues,
        }),
      );
    }

    console.error("Preselection creation error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to create preselection",
      }),
    );
  }
});
