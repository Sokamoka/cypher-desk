import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import { events, eventCategories } from "~~/server/database/schema";
import { CreateEventSchema } from "~~/utils/schemas";
import { requireSessionUser } from "~~/server/utils/auth";
import { generateEventSlug } from "~~/server/utils/slug";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  try {
    const body = await readBody(event);
    const validatedData = v.parse(CreateEventSchema, body);

    const db = drizzle(event.context.cloudflare.env.DB);

    const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const slug = generateEventSlug(validatedData.title);

    await db.insert(events).values({
      id: eventId,
      userId: user.id,
      title: validatedData.title,
      description: validatedData.description,
      location: validatedData.location,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      judges: validatedData.judges,
      slug,
    });

    const categoryNames = (validatedData.categories ?? []).filter(
      (name) => name.trim().length > 0,
    );

    if (categoryNames.length > 0) {
      await db.insert(eventCategories).values(
        categoryNames.map((name) => ({
          id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          eventId,
          name,
        })),
      );
    }

    return {
      success: true,
      eventId,
      slug,
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
