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
    const body = await readBody(event);

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

    // Update registration
    const updateData: Record<string, any> = {};

    if (body.applicantName !== undefined) {
      if (typeof body.applicantName !== 'string' || body.applicantName.trim().length === 0) {
        return sendError(
          event,
          createError({
            statusCode: 400,
            message: 'Applicant name is required',
          }),
        );
      }
      updateData.applicantName = body.applicantName;
    }

    if (body.categoryId !== undefined) {
      if (typeof body.categoryId !== 'number' || body.categoryId <= 0) {
        return sendError(
          event,
          createError({
            statusCode: 400,
            message: 'Invalid category ID',
          }),
        );
      }
      updateData.categoryId = body.categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          message: 'No fields to update',
        }),
      );
    }

    const [updatedRegistration] = await db
      .update(registrations)
      .set(updateData)
      .where(eq(registrations.id, registrationId));

    return {
      success: true,
      registrationId: updatedRegistration.id,
      message: 'Registration updated successfully',
    };
  } catch (error) {
    console.error('Update registration error:', error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: 'Failed to update registration',
      }),
    );
  }
});
