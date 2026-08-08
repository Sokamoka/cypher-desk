import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import {
  events,
  eventRegistrations,
  eventCategories,
  registrationCategories,
} from "~~/server/database/schema";
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
    .select()
    .from(events)
    .where(eq(events.id, id))
    .then((rows) => rows[0]);

  // Strict user isolation: only the owner may view their event's management
  // details (including registrations). Return 404 (not 403) to avoid leaking
  // whether the event exists at all to other users.
  if (!eventData || eventData.userId !== user.id) {
    return sendError(
      event,
      createError({ statusCode: 404, message: "Event not found" }),
    );
  }

  const registrations = await db
    .select()
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, id));

  const categories = await db
    .select({ id: eventCategories.id, name: eventCategories.name })
    .from(eventCategories)
    .where(eq(eventCategories.eventId, id));

  // Fetch each registration's selected categories via the join table, then
  // group them by registration id so every registrant carries its own
  // categories: {id, name}[] list.
  const registrationIds = registrations.map((r) => r.id);
  const registrationCategoryLinks = registrationIds.length
    ? await db
        .select({
          registrationId: registrationCategories.registrationId,
          categoryId: eventCategories.id,
          categoryName: eventCategories.name,
        })
        .from(registrationCategories)
        .innerJoin(
          eventCategories,
          eq(registrationCategories.categoryId, eventCategories.id),
        )
        .where(eq(eventCategories.eventId, id))
    : [];

  const categoriesByRegistrationId = new Map<
    number,
    { id: string; name: string }[]
  >();
  for (const link of registrationCategoryLinks) {
    const list = categoriesByRegistrationId.get(link.registrationId) ?? [];
    list.push({ id: link.categoryId, name: link.categoryName });
    categoriesByRegistrationId.set(link.registrationId, list);
  }

  const registrationsWithCategories = registrations.map((registration) => ({
    ...registration,
    categories: categoriesByRegistrationId.get(registration.id) ?? [],
  }));

  return {
    success: true,
    event: eventData,
    categories,
    registrations: registrationsWithCategories,
    registrationCount: registrations.length,
  };
});
