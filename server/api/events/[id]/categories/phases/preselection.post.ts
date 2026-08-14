import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as v from "valibot";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  preselectionPhases,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";
import { CreatePreselectionPhaseSchema } from "~~/utils/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event);

  const eventId = getRouterParam(event, "id");
  if (!eventId) {
    return sendError(
      event,
      createError({ statusCode: 400, message: "Event ID is required" }),
    );
  }

  const db = drizzle(event.context.cloudflare.env.DB);

  const eventData = await db
    .select({ id: events.id, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .then((rows) => rows[0]);

  if (!eventData || eventData.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  try {
    const body = await readBody(event);
    const validatedData = v.parse(CreatePreselectionPhaseSchema, body);

    const category = await db
      .select({ id: eventCategories.id })
      .from(eventCategories)
      .where(
        and(
          eq(eventCategories.id, validatedData.categoryId),
          eq(eventCategories.eventId, eventId),
        ),
      )
      .then((rows) => rows[0]);

    if (!category) {
      return sendError(
        event,
        createError({ statusCode: 400, message: "Invalid category selection" }),
      );
    }

    const phaseId = `phase_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await db.insert(categoryPhases).values({
      id: phaseId,
      categoryId: validatedData.categoryId,
      type: "preselection",
      name: validatedData.name,
    });

    await db.insert(preselectionPhases).values({
      phaseId,
      numberOfCypher: validatedData.numberOfCypher,
      groupSize: validatedData.groupSize,
    });

    const categoryRegistrations = await db
      .select({
        id: eventRegistrations.id,
        participantName: eventRegistrations.participantName,
        participantEmail: eventRegistrations.participantEmail,
        createdAt: eventRegistrations.createdAt,
      })
      .from(registrationCategories)
      .innerJoin(
        eventRegistrations,
        eq(registrationCategories.registrationId, eventRegistrations.id),
      )
      .where(
        and(
          eq(registrationCategories.categoryId, validatedData.categoryId),
          eq(eventRegistrations.eventId, eventId),
        ),
      );

    return {
      success: true,
      phase: {
        id: phaseId,
        type: "preselection",
        name: validatedData.name,
        categoryId: validatedData.categoryId,
        preselection: {
          numberOfCypher: validatedData.numberOfCypher,
          groupSize: validatedData.groupSize,
          categoryRegistrations,
        },
      },
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

    console.error("Preselection creation error:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to create preselection",
      }),
    );
  }
});
