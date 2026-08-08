import { drizzle } from "drizzle-orm/d1";
import { eq, and, notInArray } from "drizzle-orm";
import * as v from "valibot";
import { events, eventCategories } from "~~/server/database/schema";
import { UpdateEventSchema } from "~~/utils/schemas";
import { requireSessionUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Event ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const existing = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner may update their own event.
  if (!existing || existing.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(UpdateEventSchema, body);
    const { categories, ...eventFields } = validatedData;

    if (Object.keys(eventFields).length === 0 && categories === undefined) {
      return sendError(
        event,
        createError({ statusCode: 400, message: "No fields to update" }),
      );
    }

    if (Object.keys(eventFields).length > 0) {
      await db.update(events).set(eventFields).where(eq(events.id, id));
    }

    // Sync categories: update existing (has id), insert new (no id), and
    // delete any existing category not present in the submitted list.
    if (categories !== undefined) {
      const submittedIds = categories
        .map((category) => category.id)
        .filter((categoryId): categoryId is string => Boolean(categoryId));

      if (submittedIds.length > 0) {
        await db
          .delete(eventCategories)
          .where(
            and(
              eq(eventCategories.eventId, id),
              notInArray(eventCategories.id, submittedIds),
            ),
          );
      } else {
        // No existing categories were kept — remove all of this event's
        // categories before inserting whatever remains in the list.
        await db.delete(eventCategories).where(eq(eventCategories.eventId, id));
      }

      for (const category of categories) {
        if (category.id) {
          await db
            .update(eventCategories)
            .set({ name: category.name })
            .where(
              and(
                eq(eventCategories.id, category.id),
                eq(eventCategories.eventId, id),
              ),
            );
        } else {
          await db.insert(eventCategories).values({
            id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            eventId: id,
            name: category.name,
          });
        }
      }
    }

    return {
      success: true,
      eventId: id,
      message: "Event updated successfully",
    };
  } catch (error) {
    if (error instanceof v.ValiError) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Validation failed",
          data: error.issues,
        }),
      );
    }

    console.error("Event update error:", error);
    return sendError(
      event,
      createError({ statusCode: 500, message: "Failed to update event" }),
    );
  }
});
