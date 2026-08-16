import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
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

  // Strict user isolation: only the owner may update participants of their
  // own event. Return 404 (not 403) to avoid leaking whether the event
  // exists at all to other users.
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

    await db
      .update(eventRegistrations)
      .set({
        participantName: validatedData.participantName,
        participantEmail: validatedData.participantEmail,
      })
      .where(eq(eventRegistrations.id, registrationId));

    // Resync categories: drop existing links then reinsert whatever was
    // submitted, keeping the join table consistent with the form state.
    await db
      .delete(registrationCategories)
      .where(eq(registrationCategories.registrationId, registrationId));

    if (validatedData.categoryIds.length > 0) {
      await db.insert(registrationCategories).values(
        validatedData.categoryIds.map((categoryId) => ({
          registrationId,
          categoryId,
        })),
      );
    }

    return {
      success: true,
      message: "Participant updated successfully",
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

    console.error("Registration update error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to update participant",
      }),
    );
  }
});
