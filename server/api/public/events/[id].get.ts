import { drizzle } from "drizzle-orm/d1";
import { eq, or } from "drizzle-orm";
import {
  events,
  eventCategories,
  eventRegistrations,
  registrationCategories,
} from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Event ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  // Public lookup accepts either the event id or its public slug.
  const eventData = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      date: events.date,
      slug: events.slug,
    })
    .from(events)
    .where(or(eq(events.id, id), eq(events.slug, id)))
    .then((rows) => rows[0]);

  if (!eventData) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  const categories = await db
    .select({ id: eventCategories.id, name: eventCategories.name })
    .from(eventCategories)
    .where(eq(eventCategories.eventId, eventData.id));

  // Only expose the participant name per category — never leak `participantEmail`
  // or any other registration field on public endpoints.
  const categoryParticipantRows = await db
    .select({
      categoryId: registrationCategories.categoryId,
      participantName: eventRegistrations.participantName,
    })
    .from(registrationCategories)
    .innerJoin(
      eventRegistrations,
      eq(registrationCategories.registrationId, eventRegistrations.id),
    )
    .where(eq(eventRegistrations.eventId, eventData.id));

  const participantsByCategory = new Map<string, string[]>();
  for (const row of categoryParticipantRows) {
    const names = participantsByCategory.get(row.categoryId) ?? [];
    names.push(row.participantName);
    participantsByCategory.set(row.categoryId, names);
  }

  const categoriesWithParticipants = categories.map((category) => ({
    ...category,
    participants: participantsByCategory.get(category.id) ?? [],
  }));

  // Public payload intentionally excludes `userId` and any registration/
  // participant data (never leak `participantEmail` on public endpoints).
  return {
    success: true,
    event: { ...eventData, categories: categoriesWithParticipants },
  };
});
