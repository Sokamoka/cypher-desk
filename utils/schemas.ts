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
  // Category names for this event (e.g. "Girls", "Boys"). Optional — an
  // event may have zero categories.
  categories: v.optional(
    v.array(
      v.pipe(
        v.string(),
        v.minLength(1, "Category name is required"),
        v.maxLength(50, "Category name must be at most 50 characters"),
      ),
    ),
  ),
});

export type CreateEvent = v.InferOutput<typeof CreateEventSchema>;

// A single category as edited on the dashboard: existing categories carry
// their `id` (for update), new ones omit it (for insert).
export const EventCategoryInputSchema = v.object({
  id: v.optional(v.string()),
  name: v.pipe(
    v.string(),
    v.minLength(1, "Category name is required"),
    v.maxLength(50, "Category name must be at most 50 characters"),
  ),
});

export type EventCategoryInput = v.InferOutput<typeof EventCategoryInputSchema>;

// Update reuses the base fields but replaces `categories` (string[], used
// only at creation) with the richer id+name shape needed to diff/sync
// existing category rows on edit.
export const UpdateEventSchema = v.object({
  ...v.partial(v.omit(CreateEventSchema, ["categories"])).entries,
  categories: v.optional(v.array(EventCategoryInputSchema)),
});
export type UpdateEvent = v.InferOutput<typeof UpdateEventSchema>;

// Public event registration schema (no auth). `categoryIds` lets an
// participant register for one or more categories of the event.
export const CreateEventRegistrationSchema = v.object({
  participantName: v.pipe(
    v.string(),
    v.minLength(1, "Name is required"),
    v.maxLength(100, "Name must be at most 100 characters"),
  ),
  participantEmail: v.pipe(v.string(), v.email("Invalid email address")),
  categoryIds: v.optional(v.array(v.string()), []),
});

export type CreateEventRegistration = v.InferOutput<
  typeof CreateEventRegistrationSchema
>;

export const CreatePreselectionPhaseSchema = v.object({
  categoryId: v.pipe(v.string(), v.minLength(1, "Category is required")),
  name: v.pipe(
    v.string(),
    v.minLength(1, "Phase name is required"),
    v.maxLength(100, "Phase name must be at most 100 characters"),
  ),
  numberOfCypher: v.pipe(
    v.number(),
    v.integer("Number of cypher must be an integer"),
    v.minValue(1, "Number of cypher must be at least 1"),
  ),
  groupSize: v.pipe(
    v.number(),
    v.integer("Group size must be an integer"),
    v.minValue(1, "Group size must be at least 1"),
  ),
});

export type CreatePreselectionPhase = v.InferOutput<
  typeof CreatePreselectionPhaseSchema
>;

// Event board score schema (POST /api/events/[id]/board). Slider values are
// constrained to a 0-10 range to match the `<USlider>` used on the board page.
export const SaveBoardScoreSchema = v.object({
  participantId: v.pipe(
    v.number(),
    v.integer("Participant ID must be an integer"),
    v.minValue(1, "Participant ID is required"),
  ),
  sliderValue: v.pipe(
    v.number(),
    v.integer("Slider value must be an integer"),
    v.minValue(0, "Slider value must be at least 0"),
    v.maxValue(10, "Slider value must be at most 10"),
  ),
});

export type SaveBoardScore = v.InferOutput<typeof SaveBoardScoreSchema>;
