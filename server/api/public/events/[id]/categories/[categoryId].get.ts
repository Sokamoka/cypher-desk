import { and, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
} from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const categoryId = getRouterParam(event, "categoryId");
  if (!id || !categoryId) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: "Event ID and category ID are required",
      }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  // Public lookup accepts either the event id or its public slug.
  const eventData = await db
    .select({ id: events.id })
    .from(events)
    .where(or(eq(events.id, id), eq(events.slug, id)))
    .then((rows) => rows[0]);

  if (!eventData) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  const category = await db
    .select({ id: eventCategories.id, name: eventCategories.name })
    .from(eventCategories)
    .where(
      and(
        eq(eventCategories.id, categoryId),
        eq(eventCategories.eventId, eventData.id),
      ),
    )
    .then((rows) => rows[0]);

  // 404 (not just an empty list) if the category doesn't belong to this
  // event, to avoid leaking the existence of categories on other events.
  if (!category) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Category not found" }),
    );
  }

  const phases = await db
    .select({
      id: categoryPhases.id,
      type: categoryPhases.type,
      name: categoryPhases.name,
      createdAt: categoryPhases.createdAt,
    })
    .from(categoryPhases)
    .where(eq(categoryPhases.categoryId, category.id));

  return {
    success: true,
    event: { id: eventData.id },
    category,
    phases,
  };
});
