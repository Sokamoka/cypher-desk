import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { events } from "~~/server/database/schema";
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
    .select({ id: events.id, userId: events.userId })
    .from(events)
    .where(eq(events.id, id))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner may delete their own event.
  if (!existing || existing.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  // event_registrations rows cascade-delete via the FK's ON DELETE CASCADE.
  await db.delete(events).where(eq(events.id, id));

  return {
    success: true,
    message: "Event deleted successfully",
    id,
  };
});
