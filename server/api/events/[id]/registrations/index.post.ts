import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import {
  events,
  eventRegistrations,
  eventCategories,
  registrationCategories,
} from "~~/server/database/schema";
import { CreateEventRegistrationSchema } from "~~/utils/schemas";
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

  const eventData = await db
    .select({ id: events.id, userId: events.userId })
    .from(events)
    .where(eq(events.id, id))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner may add participants to their
  // event. Return 404 (not 403) to avoid leaking whether the event exists.
  if (!eventData || eventData.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(CreateEventRegistrationSchema, body);

    const availableCategories = await db
      .select({ id: eventCategories.id })
      .from(eventCategories)
      .where(eq(eventCategories.eventId, id));

    const availableCategoryIds = new Set(
      availableCategories.map((category) => category.id),
    );

    if (
      availableCategoryIds.size > 0 &&
      validatedData.categoryIds.length === 0
    ) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Please select at least one category",
        }),
      );
    }

    const invalidCategoryIds = validatedData.categoryIds.filter(
      (categoryId) => !availableCategoryIds.has(categoryId),
    );
    if (invalidCategoryIds.length > 0) {
      return sendError(
        event,
        createError({ statusCode: 400, message: "Invalid category selection" }),
      );
    }

    const [registration] = await db
      .insert(eventRegistrations)
      .values({
        eventId: id,
        participantName: validatedData.participantName,
        participantEmail: validatedData.participantEmail,
      })
      .returning({ id: eventRegistrations.id });

    if (validatedData.categoryIds.length > 0 && registration) {
      await db.insert(registrationCategories).values(
        validatedData.categoryIds.map((categoryId) => ({
          registrationId: registration.id,
          categoryId,
        })),
      );
    }

    return {
      success: true,
      message: "Participant added successfully",
      registrationId: registration?.id,
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

    console.error("Registration creation error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to add participant",
      }),
    );
  }
});
