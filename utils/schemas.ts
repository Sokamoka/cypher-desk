import { v } from 'valibot';

// User schemas
export const CreateUserSchema = v.object({
  email: v.pipe(
    v.string(),
    v.email('Invalid email address'),
  ),
  password: v.pipe(
    v.string(),
    v.minLength(8, 'Password must be at least 8 characters'),
  ),
  role: v.optional(
    v.picklist(['USER', 'ADMIN']),
  ),
});

export type CreateUser = v.InferOutput<typeof CreateUserSchema>;

// Category schema for dynamic categories within event creation
export const CategoryInputSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(1, 'Category name is required'),
    v.maxLength(50, 'Category name must be at most 50 characters'),
  ),
  maxCapacity: v.optional(
    v.pipe(
      v.number(),
      v.minValue(1, 'Max capacity must be at least 1'),
    ),
  ),
});

export type CategoryInput = v.InferOutput<typeof CategoryInputSchema>;

// Event schema with dynamic categories
export const CreateEventSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(1, 'Event title is required'),
    v.maxLength(100, 'Event title must be at most 100 characters'),
  ),
  description: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(1000, 'Description must be at most 1000 characters'),
    ),
  ),
  eventDate: v.pipe(
    v.string(),
    v.isoDateTime('Event date must be a valid ISO datetime'),
  ),
  location: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(200, 'Location must be at most 200 characters'),
    ),
  ),
  categories: v.pipe(
    v.array(CategoryInputSchema),
    v.minLength(1, 'At least one category is required'),
    v.maxLength(10, 'Maximum 10 categories allowed'),
  ),
});

export type CreateEvent = v.InferOutput<typeof CreateEventSchema>;

// Registration schema
export const CreateRegistrationSchema = v.object({
  eventId: v.pipe(
    v.string(),
    v.minLength(1, 'Event ID is required'),
  ),
  categoryId: v.pipe(
    v.number(),
    v.minValue(1, 'Category ID must be valid'),
  ),
  applicantName: v.pipe(
    v.string(),
    v.minLength(1, 'Name is required'),
    v.maxLength(100, 'Name must be at most 100 characters'),
  ),
  applicantEmail: v.pipe(
    v.string(),
    v.email('Invalid email address'),
  ),
});

export type CreateRegistration = v.InferOutput<typeof CreateRegistrationSchema>;

// Update schemas
export const UpdateEventSchema = v.partial(CreateEventSchema);
export type UpdateEvent = v.InferOutput<typeof UpdateEventSchema>;
