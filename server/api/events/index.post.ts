import { drizzle } from "drizzle-orm/cloudflare-d1";
import { v } from "valibot";
import { events, categories } from "~/server/database/schema";
import { CreateEventSchema } from "~~/utils/schemas";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate input
    const validatedData = v.parse(CreateEventSchema, body);

    // Get database from Cloudflare D1 binding
    const db = drizzle(event.context.cloudflare.env.DB);

    // Generate event ID (UUID-like for this example)
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create event and categories in a transaction
    const result = await db.transaction(async (tx) => {
      // Insert event
      await tx.insert(events).values({
        id: eventId,
        title: validatedData.title,
        description: validatedData.description,
        eventDate: validatedData.eventDate,
        location: validatedData.location,
      });

      // Insert categories for this event
      const categoryIds: number[] = [];
      for (const cat of validatedData.categories) {
        const catResult = await tx.insert(categories).values({
          eventId: eventId,
          name: cat.name,
          maxCapacity: cat.maxCapacity,
        });
        categoryIds.push(catResult.lastID as number);
      }

      return { eventId, categoryIds };
    });

    return {
      success: true,
      eventId: result.eventId,
      categoryCount: result.categoryIds.length,
      message: "Event created successfully",
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

    console.error("Event creation error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to create event",
      }),
    );
  }
});
