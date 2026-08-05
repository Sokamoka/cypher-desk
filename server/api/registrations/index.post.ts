import { drizzle } from "drizzle-orm/cloudflare-d1";
import { eq, and } from "drizzle-orm";
import { v } from "valibot";
import { registrations, events, categories } from "~/server/database/schema";
import { CreateRegistrationSchema } from "~~/utils/schemas";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate input
    const validatedData = v.parse(CreateRegistrationSchema, body);

    const db = drizzle(event.context.cloudflare.env.DB);

    // Verify event exists
    const eventExists = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, validatedData.eventId))
      .then((results) => results.length > 0);

    if (!eventExists) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Event not found",
        }),
      );
    }

    // Verify category exists and belongs to this event
    const categoryExists = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, validatedData.categoryId),
          eq(categories.eventId, validatedData.eventId),
        ),
      )
      .then((results) => results.length > 0);

    if (!categoryExists) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: "Category not found or does not belong to this event",
        }),
      );
    }

    // Create registration
    const result = await db.insert(registrations).values({
      eventId: validatedData.eventId,
      categoryId: validatedData.categoryId,
      applicantName: validatedData.applicantName,
      applicantEmail: validatedData.applicantEmail,
    });

    return {
      success: true,
      registrationId: result.lastID,
      message: "Registration submitted successfully",
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

    console.error("Registration error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to create registration",
      }),
    );
  }
});
