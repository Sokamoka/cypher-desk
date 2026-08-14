import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  categoryPhases,
  eventCategories,
  eventRegistrations,
  events,
  preselectionPhases,
  registrationCategories,
} from "~~/server/database/schema";
import { requireSessionUser } from "~~/server/utils/auth";

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

  const categories = await db
    .select({
      id: eventCategories.id,
      name: eventCategories.name,
      createdAt: eventCategories.createdAt,
    })
    .from(eventCategories)
    .where(eq(eventCategories.eventId, eventId));

  const phaseRows = await db
    .select({
      phaseId: categoryPhases.id,
      categoryId: categoryPhases.categoryId,
      type: categoryPhases.type,
      name: categoryPhases.name,
      createdAt: categoryPhases.createdAt,
      numberOfCypher: preselectionPhases.numberOfCypher,
      groupSize: preselectionPhases.groupSize,
    })
    .from(categoryPhases)
    .innerJoin(
      eventCategories,
      eq(categoryPhases.categoryId, eventCategories.id),
    )
    .leftJoin(preselectionPhases, eq(preselectionPhases.phaseId, categoryPhases.id))
    .where(eq(eventCategories.eventId, eventId));

  const categoryIds = Array.from(
    new Set(
      phaseRows
        .map((row) => row.categoryId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const registrationRows =
    categoryIds.length > 0
      ? await db
          .select({
            categoryId: registrationCategories.categoryId,
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
              inArray(registrationCategories.categoryId, categoryIds),
              eq(eventRegistrations.eventId, eventId),
            ),
          )
      : [];

  const registrationsByCategory = new Map<
    string,
    { id: number; participantName: string; participantEmail: string; createdAt: string }[]
  >();
  for (const registration of registrationRows) {
    const list = registrationsByCategory.get(registration.categoryId) ?? [];
    list.push({
      id: registration.id,
      participantName: registration.participantName,
      participantEmail: registration.participantEmail,
      createdAt: registration.createdAt,
    });
    registrationsByCategory.set(registration.categoryId, list);
  }

  const phasesByCategoryId = new Map<
    string,
    {
      id: string;
      type: string;
      name: string;
      createdAt: string;
      preselection:
        | {
            numberOfCypher: number;
            groupSize: number;
            categoryRegistrations: {
              id: number;
              participantName: string;
              participantEmail: string;
              createdAt: string;
            }[];
          }
        | null;
    }[]
  >();

  for (const row of phaseRows) {
    const existing = phasesByCategoryId.get(row.categoryId) ?? [];
    const preselection = row.numberOfCypher !== null && row.groupSize !== null
      ? {
          numberOfCypher: row.numberOfCypher ?? 0,
          groupSize: row.groupSize ?? 0,
          categoryRegistrations:
            registrationsByCategory.get(row.categoryId) ?? [],
        }
      : null;

    existing.push({
      id: row.phaseId,
      type: row.type,
      name: row.name,
      createdAt: row.createdAt,
      preselection,
    });
    phasesByCategoryId.set(row.categoryId, existing);
  }

  return {
    success: true,
    categories: categories.map((category) => ({
      ...category,
      phases: phasesByCategoryId.get(category.id) ?? [],
    })),
  };
});
