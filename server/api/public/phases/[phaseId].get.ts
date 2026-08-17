import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
  preselectionPhases,
} from "~~/server/database/schema";
import { parseEventJudges } from "~~/server/utils/event-judges";

// Public, read-only phase context (event/category/phase) for the `/e/[id]`
// live drilldown. Mirrors `/api/phases/[id].get.ts` but skips auth, and never
// exposes `eventUserId` or the registrations list (no PII on public routes).
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
      phaseType: categoryPhases.type,
      phaseName: categoryPhases.name,
      phaseCreatedAt: categoryPhases.createdAt,
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      eventId: events.id,
      eventTitle: events.title,
      eventDescription: events.description,
      eventLocation: events.location,
      eventStartDate: events.startDate,
      eventEndDate: events.endDate,
      eventJudgesRaw: sql<string>`${events.judges}`.as("event_judges_raw"),
      eventSlug: events.slug,
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

  if (!phaseContext) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

  return {
    success: true,
    event: {
      id: phaseContext.eventId,
      title: phaseContext.eventTitle,
      description: phaseContext.eventDescription,
      location: phaseContext.eventLocation,
      startDate: phaseContext.eventStartDate,
      endDate: phaseContext.eventEndDate,
      judges: parseEventJudges(phaseContext.eventJudgesRaw),
      slug: phaseContext.eventSlug,
    },
    category: {
      id: phaseContext.categoryId,
      name: phaseContext.categoryName,
    },
    phase: {
      id: phaseContext.phaseId,
      type: phaseContext.phaseType,
      name: phaseContext.phaseName,
      createdAt: phaseContext.phaseCreatedAt,
      preselection:
        phaseContext.numberOfCypher !== null &&
        phaseContext.groupSize !== null
          ? {
              numberOfCypher: phaseContext.numberOfCypher,
              groupSize: phaseContext.groupSize,
            }
          : null,
    },
  };
});
