import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  preselectionPhases,
  registrationCategories,
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
      eventCreatedAt: events.createdAt,
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
        eq(registrationCategories.categoryId, phaseContext.categoryId),
        eq(eventRegistrations.eventId, phaseContext.eventId),
      ),
    );

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
      createdAt: phaseContext.eventCreatedAt,
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
    registrations,
  };
});
