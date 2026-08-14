import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
  eventRegistrations,
  phaseBoardScores,
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

  const results = registrations
    .map((registration) => ({
      id: registration.id,
      name: registration.participantName,
      score: scoreByParticipantId.get(registration.id) ?? null,
    }))
    // Highest score first; participants without a score yet are pushed to
    // the bottom, ordered alphabetically among themselves.
    .sort((a, b) => {
      if (a.score === null && b.score === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

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
    results,
  };
});
