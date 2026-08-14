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

  // Only expose the attendee name per category — never leak `attendeeEmail`
  // or any other registration field on public endpoints.
  const categoryAttendeeRows = await db
    .select({
      categoryId: registrationCategories.categoryId,
      attendeeName: eventRegistrations.attendeeName,
    })
    .from(registrationCategories)
    .innerJoin(
      eventRegistrations,
      eq(registrationCategories.registrationId, eventRegistrations.id),
    )
    .where(eq(eventRegistrations.eventId, eventData.id));

  const attendeesByCategory = new Map<string, string[]>();
  for (const row of categoryAttendeeRows) {
    const names = attendeesByCategory.get(row.categoryId) ?? [];
    names.push(row.attendeeName);
    attendeesByCategory.set(row.categoryId, names);
  }

  const categoriesWithAttendees = categories.map((category) => ({
    ...category,
    attendees: attendeesByCategory.get(category.id) ?? [],
  }));

  // Public payload intentionally excludes `userId` and any registration/
  // attendee data (never leak `attendeeEmail` on public endpoints).
  return {
    success: true,
    event: { ...eventData, categories: categoriesWithAttendees },
  };
});
