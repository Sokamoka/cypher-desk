import { drizzle } from "drizzle-orm/d1";
import { registrations } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  try {
    const db = drizzle(event.context.cloudflare.env.DB);

    // Fetch all registrations
    const allRegistrations = await db.select().from(registrations);

    return {
      success: true,
      registrations: allRegistrations,
      total: allRegistrations.length,
    };
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        message: "Failed to fetch registrations",
      }),
    );
  }
});
