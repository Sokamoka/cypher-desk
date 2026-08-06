import { drizzle } from "drizzle-orm/d1";
import { events, categories } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  try {
    const db = drizzle(event.context.cloudflare.env.DB);

    // Fetch all events
    const allEvents = await db.select().from(events);

    // Fetch all categories
    const allCategories = await db.select().from(categories);

    // Enrich events with their categories
    const enrichedEvents = allEvents.map((evt) => {
      const eventCategories = allCategories.filter(
        (cat) => cat.eventId === evt.id,
      );

      return {
        id: evt.id,
        title: evt.title,
        description: evt.description,
        eventDate: evt.eventDate,
        location: evt.location,
        categories: eventCategories,
        createdAt: evt.createdAt,
      };
    });

    return {
      success: true,
      events: enrichedEvents,
      total: enrichedEvents.length,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to fetch events",
      }),
    );
  }
});
