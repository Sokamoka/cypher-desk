import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import {
  categoryPhases,
  eventCategories,
  events,
  eventRegistrations,
  phaseBoardScores,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { SaveBoardScoreSchema } from "~~/utils/schemas";

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
  // to may save scores on its board. Return 404 (not 403) to avoid leaking
  // whether the phase exists at all.
  if (!phaseContext || phaseContext.eventUserId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(SaveBoardScoreSchema, body);

    const participant = await db
      .select({ id: eventRegistrations.id })
      .from(registrationCategories)
      .innerJoin(
        eventRegistrations,
        eq(registrationCategories.registrationId, eventRegistrations.id),
      )
      .where(
        and(
          eq(eventRegistrations.id, validatedData.participantId),
          eq(registrationCategories.categoryId, phaseContext.categoryId),
          eq(eventRegistrations.eventId, phaseContext.eventId),
        ),
      )
      .then((rows) => rows[0]);

    if (!participant) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Invalid participant selection",
        }),
      );
    }

    await db
      .insert(phaseBoardScores)
      .values({
        phaseId,
        participantId: validatedData.participantId,
        sliderValue: validatedData.sliderValue,
      })
      .onConflictDoUpdate({
        target: [phaseBoardScores.phaseId, phaseBoardScores.participantId],
        set: {
          sliderValue: validatedData.sliderValue,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });

    return {
      success: true,
      participantId: validatedData.participantId,
      sliderValue: validatedData.sliderValue,
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

    console.error("Board score save error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to save board score",
      }),
    );
  }
});
