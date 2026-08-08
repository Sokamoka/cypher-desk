import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { events } from "~~/server/database/schema";
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

    if (Object.keys(validatedData).length === 0) {
      return sendError(
        event,
        createError({ statusCode: 400, message: "No fields to update" }),
      );
    }

    await db.update(events).set(validatedData).where(eq(events.id, id));

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
