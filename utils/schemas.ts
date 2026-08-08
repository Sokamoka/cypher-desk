import * as v from "valibot";

// Event schema (user-owned, created via /api/events, POST body only —
// id/slug/userId are generated/attached server-side)
export const CreateEventSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(1, "Event title is required"),
    v.maxLength(100, "Event title must be at most 100 characters"),
  ),
  description: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(1000, "Description must be at most 1000 characters"),
    ),
  ),
  date: v.pipe(
    v.string(),
    v.isoDateTime("Event date must be a valid ISO datetime"),
  ),
});

export type CreateEvent = v.InferOutput<typeof CreateEventSchema>;

export const UpdateEventSchema = v.partial(CreateEventSchema);
export type UpdateEvent = v.InferOutput<typeof UpdateEventSchema>;

// Public event registration schema (no auth, no categories — flat model)
export const CreateEventRegistrationSchema = v.object({
  attendeeName: v.pipe(
    v.string(),
    v.minLength(1, "Name is required"),
    v.maxLength(100, "Name must be at most 100 characters"),
  ),
  attendeeEmail: v.pipe(v.string(), v.email("Invalid email address")),
});

export type CreateEventRegistration = v.InferOutput<
  typeof CreateEventRegistrationSchema
>;
