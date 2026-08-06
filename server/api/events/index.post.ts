import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import { events, categories } from "~~/server/database/schema";
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

    // Local D1 runtime does not allow SQL BEGIN/SAVEPOINT from Drizzle transaction().
    // Use sequential inserts for compatibility.
    await db.insert(events).values({
      id: eventId,
      title: validatedData.title,
      description: validatedData.description,
      eventDate: validatedData.eventDate,
      location: validatedData.location,
    });

    let createdCategoryCount = 0;
    for (const cat of validatedData.categories) {
      await db.insert(categories).values({
        eventId: eventId,
        name: cat.name,
        maxCapacity: cat.maxCapacity,
      });
      createdCategoryCount += 1;
    }

    return {
      success: true,
      eventId,
      categoryCount: createdCategoryCount,
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
