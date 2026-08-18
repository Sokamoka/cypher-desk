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

  const categoryId = getRouterParam(event, "id");
  if (!categoryId) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Category ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const categoryContext = await db
    .select({
      categoryId: eventCategories.id,
      categoryName: eventCategories.name,
      categoryCreatedAt: eventCategories.createdAt,
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
    })
    .from(eventCategories)
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(eq(eventCategories.id, categoryId))
    .then((rows) => rows[0]);

  if (!categoryContext || categoryContext.eventUserId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Category not found" }),
    );
  }

  const phaseRows = await db
    .select({
      phaseId: categoryPhases.id,
      type: categoryPhases.type,
      name: categoryPhases.name,
      createdAt: categoryPhases.createdAt,
      numberOfCypher: preselectionPhases.numberOfCypher,
      groupSize: preselectionPhases.groupSize,
    })
    .from(categoryPhases)
    .leftJoin(preselectionPhases, eq(preselectionPhases.phaseId, categoryPhases.id))
    .where(eq(categoryPhases.categoryId, categoryId));

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
        eq(registrationCategories.categoryId, categoryId),
        eq(eventRegistrations.eventId, categoryContext.eventId),
      ),
    );

  const phases = phaseRows.map((phase) => ({
    id: phase.phaseId,
    type: phase.type,
    name: phase.name,
    createdAt: phase.createdAt,
    preselection:
      phase.numberOfCypher !== null && phase.groupSize !== null
        ? {
            numberOfCypher: phase.numberOfCypher,
            groupSize: phase.groupSize,
            categoryRegistrations,
          }
        : null,
  }));

  return {
    success: true,
    event: {
      id: categoryContext.eventId,
      title: categoryContext.eventTitle,
      description: categoryContext.eventDescription,
      location: categoryContext.eventLocation,
      startDate: categoryContext.eventStartDate,
      endDate: categoryContext.eventEndDate,
      judges: parseEventJudges(categoryContext.eventJudgesRaw),
      slug: categoryContext.eventSlug,
      createdAt: categoryContext.eventCreatedAt,
    },
    category: {
      id: categoryContext.categoryId,
      name: categoryContext.categoryName,
      createdAt: categoryContext.categoryCreatedAt,
      // Exposed independently of `phases` so the "create preselection" form
      // can preview/submit a participant distribution before any
      // preselection phase exists yet for this category.
      registrations: categoryRegistrations,
      phases,
    },
  };
});
