import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
  eventRegistrations,
  phaseBoardScores,
  phaseBoards,
  registrationCategories,
} from "~~/server/database/schema";

// Public, read-only ranked results for a phase. Mirrors the organizer-only
// `/api/phases/[id]/result.get.ts` sort/shape, but skips auth and never
// exposes `participantEmail` or `eventUserId` (no PII on public routes).
// There is no public equivalent of `board.post.ts` — scoring stays
// organizer-only.
export default defineEventHandler(async (event) => {
  const phaseId = getRouterParam(event, "phaseId");
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
    })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(eq(categoryPhases.id, phaseId))
    .then((rows) => rows[0]);

  if (!phaseContext) {
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
    isPhaseStarted: board?.isStarted ?? false,
    results,
  };
});
