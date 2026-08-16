import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { events } from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { parseEventJudges } from "~~/server/utils/event-judges";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const db = drizzle(event.context.cloudflare.env.DB);

  // Strict user isolation: only return events owned by the current user.
  const userEvents = await db
    .select({
      id: events.id,
      userId: events.userId,
      title: events.title,
      description: events.description,
      location: events.location,
      startDate: events.startDate,
      endDate: events.endDate,
      judgesRaw: sql<string>`${events.judges}`.as("judges_raw"),
      slug: events.slug,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.userId, user.id));

  return {
    success: true,
    events: userEvents.map(({ judgesRaw, ...eventItem }) => ({
      ...eventItem,
      judges: parseEventJudges(judgesRaw),
    })),
    total: userEvents.length,
  };
});
