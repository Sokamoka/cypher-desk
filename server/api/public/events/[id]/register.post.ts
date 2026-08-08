import { drizzle } from "drizzle-orm/d1";
import { eq, or } from "drizzle-orm";
import * as v from "valibot";
import { events, eventRegistrations } from "~~/server/database/schema";
import { CreateEventRegistrationSchema } from "~~/utils/schemas";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Event ID is required" }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(CreateEventRegistrationSchema, body);

    const db = drizzle(event.context.cloudflare.env.DB);

    // Public lookup accepts either the event id or its public slug.
    const eventData = await db
      .select({ id: events.id })
      .from(events)
      .where(or(eq(events.id, id), eq(events.slug, id)))
      .then((rows) => rows[0]);

    if (!eventData) {
      return sendError(
        event,
        createError({ statusCode: 404, message: "Event not found" }),
      );
    }

    await db.insert(eventRegistrations).values({
      eventId: eventData.id,
      attendeeName: validatedData.attendeeName,
      attendeeEmail: validatedData.attendeeEmail,
    });

    // Response intentionally omits other attendees' data — never echo the
    // registrations list or any other applicant's `attendeeEmail` here.
    return {
      success: true,
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
