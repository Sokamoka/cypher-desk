import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import { events } from "~~/server/database/schema";
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
      date: validatedData.date,
      slug,
    });

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
