import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { events } from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const db = drizzle(event.context.cloudflare.env.DB);

  // Strict user isolation: only return events owned by the current user.
  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.userId, user.id));

  return {
    success: true,
    events: userEvents,
    total: userEvents.length,
  };
});
