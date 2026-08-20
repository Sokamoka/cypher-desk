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
import { broadcastToPhase } from "~~/server/utils/ws-rooms";
import { SaveCypherJudgeScoreSchema } from "~~/utils/schemas";

// Rounds to one decimal place so multi-judge averages don't display long
// floating point tails (e.g. 7.333333333333333). Kept in sync with the
// same helper in `server/api/phases/[id]/result.get.ts`.
function averageJudgeScores(sliderValues: number[]): number {
  const sum = sliderValues.reduce((total, value) => total + value, 0);
  return Math.round((sum / sliderValues.length) * 10) / 10;
}

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
      phaseId: categoryPhases.id,
      categoryId: eventCategories.id,
      eventId: events.id,
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

    try {
      // A participant's live-displayed score is the average across every
      // judge who has scored them in this cypher, not just this judge's
      // own slider value — broadcast the recomputed average so
      // `result.vue` shows the same figure it would get on a refetch.
      const participantScores = await db
        .select({ sliderValue: cypherJudgeScores.sliderValue })
        .from(cypherJudgeScores)
        .where(
          and(
            eq(cypherJudgeScores.cypherId, cypherId),
            eq(cypherJudgeScores.participantId, validatedData.participantId),
          ),
        );

      const averageScore = averageJudgeScores(
        participantScores.map((score) => score.sliderValue),
      );

      broadcastToPhase(cypherContext.phaseId, {
        type: "score-updated",
        eventId: cypherContext.eventId,
        categoryId: cypherContext.categoryId,
        phaseId: cypherContext.phaseId,
        participantId: validatedData.participantId,
        sliderValue: averageScore,
      });
    } catch (broadcastError) {
      // A broadcast failure must never fail the save request itself.
      console.error(
        "Failed to broadcast judge score update:",
        broadcastError,
      );
    }

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
