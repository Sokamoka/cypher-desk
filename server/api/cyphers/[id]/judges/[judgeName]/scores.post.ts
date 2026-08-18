import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import {
  categoryPhases,
  cypherJudgeScores,
  eventCategories,
  eventRegistrations,
  events,
  preselectionCypherParticipants,
  preselectionCyphers,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { SaveCypherJudgeScoreSchema } from "~~/utils/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const cypherId = getRouterParam(event, "id");
  const judgeNameParam = getRouterParam(event, "judgeName");
  if (!cypherId || !judgeNameParam) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: "Cypher ID and judge name are required",
      }),
    );
  }
  const judgeName = decodeURIComponent(judgeNameParam);

  const db = drizzle(event.context.cloudflare.env.DB);

  const cypherContext = await db
    .select({
      cypherId: preselectionCyphers.id,
      judgesRaw: sql<string>`${preselectionCyphers.judges}`.as(
        "cypher_judges_raw",
      ),
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
  // to may save judge scores on it. Return 404 (not 403) to avoid leaking
  // whether the cypher exists at all.
  if (!cypherContext || cypherContext.eventUserId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Cypher not found" }),
    );
  }

  const assignedJudges = JSON.parse(cypherContext.judgesRaw) as string[];
  if (!assignedJudges.includes(judgeName)) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: "This judge is not assigned to this cypher",
      }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(SaveCypherJudgeScoreSchema, body);

    // Defense-in-depth: the participant must actually be assigned to this
    // cypher — never trust a client-supplied participantId blindly.
    const participant = await db
      .select({ id: eventRegistrations.id })
      .from(preselectionCypherParticipants)
      .innerJoin(
        eventRegistrations,
        eq(
          preselectionCypherParticipants.registrationId,
          eventRegistrations.id,
        ),
      )
      .where(
        and(
          eq(preselectionCypherParticipants.cypherId, cypherId),
          eq(eventRegistrations.id, validatedData.participantId),
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
      .insert(cypherJudgeScores)
      .values({
        cypherId,
        judgeName,
        participantId: validatedData.participantId,
        sliderValue: validatedData.sliderValue,
      })
      .onConflictDoUpdate({
        target: [
          cypherJudgeScores.cypherId,
          cypherJudgeScores.judgeName,
          cypherJudgeScores.participantId,
        ],
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

    console.error("Judge score save error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to save judge score",
      }),
    );
  }
});
