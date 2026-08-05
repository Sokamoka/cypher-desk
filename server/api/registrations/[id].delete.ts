import { drizzle } from 'drizzle-orm/cloudflare-d1';
import { eq } from 'drizzle-orm';
import { registrations } from '~/server/database/schema';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');

    if (!id || isNaN(Number(id))) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: 'Invalid registration ID',
        }),
      );
    }

    const registrationId = Number(id);

    const db = drizzle(event.context.cloudflare.env.DB);

    // Verify registration exists
    const existingRegistration = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, registrationId))
      .then((results) => results[0]);

    if (!existingRegistration) {
      return sendError(
        event,
        createError({
          statusCode: 404,
          message: 'Registration not found',
        }),
      );
    }

    // Delete registration
    await db
      .delete(registrations)
      .where(eq(registrations.id, registrationId));

    return {
      success: true,
      message: 'Registration deleted successfully',
      id: registrationId,
    };
  } catch (error) {
    console.error('Delete registration error:', error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: 'Failed to delete registration',
      }),
    );
  }
});
