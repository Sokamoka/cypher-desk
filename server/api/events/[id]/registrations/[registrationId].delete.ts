import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { events, eventRegistrations } from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const id = getRouterParam(event, "id");
  const registrationIdParam = getRouterParam(event, "registrationId");
  const registrationId = Number(registrationIdParam);

  if (!id || !registrationIdParam || Number.isNaN(registrationId)) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: "Event ID and registration ID are required",
      }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const eventData = await db
    .select({ id: events.id, userId: events.userId })
    .from(events)
    .where(eq(events.id, id))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner may delete participants from
  // their own event. Return 404 (not 403) to avoid leaking whether the
  // event exists at all to other users.
  if (!eventData || eventData.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  const registration = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, registrationId),
        eq(eventRegistrations.eventId, id),
      ),
    )
    .then((rows) => rows[0]);

  if (!registration) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Participant not found" }),
    );
  }

  try {
    // `registration_categories` rows cascade-delete via the FK's
    // `onDelete: "cascade"`, so deleting the registration is sufficient.
    await db
      .delete(eventRegistrations)
      .where(eq(eventRegistrations.id, registrationId));

    return {
      success: true,
      message: "Participant deleted successfully",
    };
  } catch (error) {
    console.error("Registration delete error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to delete participant",
      }),
    );
  }
});
