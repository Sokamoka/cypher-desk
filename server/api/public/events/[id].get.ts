import { drizzle } from "drizzle-orm/d1";
import { eq, or } from "drizzle-orm";
import { events } from "~~/server/database/schema";

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

  // Public payload intentionally excludes `userId` and any registration/
  // attendee data (never leak `attendeeEmail` on public endpoints).
  return {
    success: true,
    event: eventData,
  };
});
