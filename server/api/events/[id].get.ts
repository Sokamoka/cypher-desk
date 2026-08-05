import { drizzle } from 'drizzle-orm/cloudflare-d1';
import { eq } from 'drizzle-orm';
import {
  events,
  categories,
  registrations,
} from '~/server/database/schema';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');

    if (!id) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: 'Event ID is required',
        }),
      );
    }

    const db = drizzle(event.context.cloudflare.env.DB);

    // Fetch event details
    const eventData = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .then((results) => results[0]);

    if (!eventData) {
      return sendError(
        event,
        createError({
          statusCode: 404,
          message: 'Event not found',
        }),
      );
    }

    // Fetch categories for this event
    const eventCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.eventId, id));

    // Fetch registrations, excluding applicantEmail for privacy
    const allRegistrations = await db
      .select({
        id: registrations.id,
        categoryId: registrations.categoryId,
        applicantName: registrations.applicantName,
        createdAt: registrations.createdAt,
      })
      .from(registrations)
      .where(eq(registrations.eventId, id));

    // Group registrations by category
    const participantsByCategory = eventCategories.reduce(
      (acc, cat) => {
        acc[cat.id] = {
          category: cat,
          participants: allRegistrations
            .filter((reg) => reg.categoryId === cat.id)
            .map((reg) => ({
              id: reg.id,
              name: reg.applicantName,
              createdAt: reg.createdAt,
            })),
        };
        return acc;
      },
      {} as Record<
        number,
        {
          category: (typeof eventCategories)[0];
          participants: Array<{
            id: number;
            name: string;
            createdAt: string;
          }>;
        }
      >,
    );

    return {
      success: true,
      event: {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        eventDate: eventData.eventDate,
        location: eventData.location,
        categories: eventCategories,
        participantsByCategory,
        registrationCount: allRegistrations.length,
        createdAt: eventData.createdAt,
      },
    };
  } catch (error) {
    console.error('Error fetching event details:', error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: 'Failed to fetch event details',
      }),
    );
  }
});
