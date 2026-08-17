import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  events,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

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

  const phase = await db
    .select({ id: categoryPhases.id, eventUserId: events.userId })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .innerJoin(events, eq(eventCategories.eventId, events.id))
    .where(and(eq(categoryPhases.id, phaseId), eq(events.userId, user.id)))
    .then((rows) => rows[0]);

  if (!phase) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Phase not found" }),
    );
  }

  await db.delete(categoryPhases).where(eq(categoryPhases.id, phase.id));

  return {
    success: true,
    message: "Phase deleted successfully",
    id: phase.id,
  };
});
