import * as v from "valibot";

export const EventJudgeSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(1, "Judge name is required"),
    v.maxLength(100, "Judge name must be at most 100 characters"),
  ),
});

// Event schema (user-owned, created via /api/events, POST body only —
// id/slug/userId are generated/attached server-side)
const EventFieldsSchema = v.object({
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
  location: v.pipe(
    v.string(),
    v.minLength(1, "Location is required"),
    v.maxLength(100, "Location must be at most 100 characters"),
  ),
  startDate: v.pipe(
    v.string(),
    v.isoDate("Start date must be a valid ISO date (YYYY-MM-DD)"),
  ),
  endDate: v.pipe(
    v.string(),
    v.isoDate("End date must be a valid ISO date (YYYY-MM-DD)"),
  ),
  judges: v.array(EventJudgeSchema),
});

export const CreateEventSchema = v.pipe(
  v.object({
    ...EventFieldsSchema.entries,
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
  }),
  v.check(
    (input) => input.endDate >= input.startDate,
    "End date must be equal to or after start date",
  ),
);

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
export const UpdateEventSchema = v.pipe(
  v.object({
    ...v.partial(EventFieldsSchema).entries,
    categories: v.optional(v.array(EventCategoryInputSchema)),
  }),
  v.check(
    (input) =>
      input.startDate === undefined ||
      input.endDate === undefined ||
      input.endDate >= input.startDate,
    "End date must be equal to or after start date",
  ),
);
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

// Judges assigned to a single cypher within a preselection phase. At least
// one judge is required; the maximum is enforced dynamically against the
// event's actual judge count via `createPreselectionPhaseSchema` below (the
// same judge may be assigned to multiple cyphers, so no cross-cypher
// uniqueness check is applied here).
export const PreselectionCypherInputSchema = v.object({
  judges: v.pipe(
    v.array(v.pipe(v.string(), v.minLength(1, "Judge name is required"))),
    v.minLength(1, "Select at least one judge"),
  ),
});

export type PreselectionCypherInput = v.InferOutput<
  typeof PreselectionCypherInputSchema
>;

const PreselectionPhaseFieldsSchema = {
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
  cyphers: v.array(PreselectionCypherInputSchema),
};

// Base/back-compat schema used where the event's real judge count isn't
// known ahead of time (e.g. type inference). Prefer
// `createPreselectionPhaseSchema` when the judge count is available so each
// cypher's judge selection is capped at the event's total judge count.
export const CreatePreselectionPhaseSchema = v.pipe(
  v.object(PreselectionPhaseFieldsSchema),
  v.check(
    (input) => input.cyphers.length === input.numberOfCypher,
    "Judges must be assigned for each cypher",
  ),
);

export type CreatePreselectionPhase = v.InferOutput<
  typeof CreatePreselectionPhaseSchema
>;

// Factory producing a stricter variant of `CreatePreselectionPhaseSchema`
// that also caps each cypher's judge selection at `judgeCount` (the number
// of judges assigned to the event). Used both client-side (bound reactively
// to the event's judge list) and server-side (with the real, DB-sourced
// judge count — never trusted from the client) for defense-in-depth.
export function createPreselectionPhaseSchema(judgeCount: number) {
  return v.pipe(
    v.object({
      ...PreselectionPhaseFieldsSchema,
      cyphers: v.array(
        v.object({
          judges: v.pipe(
            v.array(
              v.pipe(v.string(), v.minLength(1, "Judge name is required")),
            ),
            v.minLength(1, "Select at least one judge"),
            v.maxLength(
              judgeCount,
              `Select at most ${judgeCount} judge(s)`,
            ),
          ),
        }),
      ),
    }),
    v.check(
      (input) => input.cyphers.length === input.numberOfCypher,
      "Judges must be assigned for each cypher",
    ),
  );
}

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
