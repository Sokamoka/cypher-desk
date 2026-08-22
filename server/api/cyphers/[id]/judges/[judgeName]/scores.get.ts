import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  cypherJudgeScores,
  eventCategories,
  events,
  phaseBoards,
  preselectionCyphers,
  preselectionPhases,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { getCypherGroupsState } from "~~/server/utils/cypher-groups";

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
      cypherIndex: preselectionCyphers.cypherIndex,
      judgesRaw: sql<string>`${preselectionCyphers.judges}`.as(
        "cypher_judges_raw",
      ),
      phaseId: categoryPhases.id,
      phaseName: categoryPhases.name,
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      eventId: events.id,
      eventTitle: events.title,
      eventUserId: events.userId,
      groupSize: preselectionPhases.groupSize,
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
    .innerJoin(
      preselectionPhases,
      eq(preselectionPhases.phaseId, categoryPhases.id),
    )
    .where(eq(preselectionCyphers.id, cypherId))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner of the event this cypher belongs
  // to may view judge scores. Return 404 (not 403) to avoid leaking
  // existence.
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

  const board = await db
    .select({ isStarted: phaseBoards.isStarted })
    .from(phaseBoards)
    .where(eq(phaseBoards.phaseId, cypherContext.phaseId))
    .then((rows) => rows[0]);

  // Own-judge scores (used to prefill each participant's slider/saved
  // state), separate from the cross-judge completion data below.
  const ownScores = await db
    .select({
      participantId: cypherJudgeScores.participantId,
      sliderValue: cypherJudgeScores.sliderValue,
    })
    .from(cypherJudgeScores)
    .where(
      and(
        eq(cypherJudgeScores.cypherId, cypherId),
        eq(cypherJudgeScores.judgeName, judgeName),
      ),
    );

  const scoreByParticipantId = new Map(
    ownScores.map((score) => [score.participantId, score.sliderValue]),
  );

  // Derived, cross-judge grouping/progression state: which group each
  // participant belongs to, whether every assigned judge has finished the
  // current group, and which judges (if any) the current group is still
  // waiting on.
  const { groups, groupsCompletion, currentStepIndex, totalSteps } =
    await getCypherGroupsState(
      db,
      cypherId,
      assignedJudges,
      cypherContext.groupSize,
    );

  const participants = groups.flatMap((group, groupIndex) =>
    group.map((participant) => {
      const savedValue = scoreByParticipantId.get(participant.id) ?? null;
      return {
        id: participant.id,
        name: participant.participantName,
        sliderValue: savedValue ?? 5,
        savedValue,
        isSaved: savedValue !== null,
        groupIndex,
      };
    }),
  );

  const currentGroupCompletion = groupsCompletion[currentStepIndex];

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
      name: cypherContext.phaseName,
    },
    cypher: {
      id: cypherContext.cypherId,
      cypherIndex: cypherContext.cypherIndex,
    },
    judgeName,
    isPhaseStarted: board?.isStarted ?? false,
    groupSize: cypherContext.groupSize,
    totalSteps,
    currentStepIndex,
    pendingJudges: currentGroupCompletion?.pendingJudges ?? [],
    participants,
  };
});
