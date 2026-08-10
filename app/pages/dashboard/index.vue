<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";
import {
  CreateEventSchema,
  type CreateEvent,
  type UpdateEvent,
} from "~~/utils/schemas";

// The edit form's client-side state keeps `categories` as plain tag names
// (matching UInputTags), separate from `UpdateEventSchema` which expects
// {id?, name}[] on the wire — the id/name payload is built in
// `onUpdateEvent` right before the PUT request.
const EditEventFormSchema = v.object({
  ...v.partial(v.omit(CreateEventSchema, ["categories"])).entries,
  categories: v.optional(v.array(v.string())),
});

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

useSeoMeta({
  title: "My Events",
  description: "Manage the events you organize",
});

const toast = useToast();

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  slug: string;
  createdAt: string;
}

const {
  data: eventsData,
  pending,
  error,
  refresh,
} = await useFetch<{ success: boolean; events: DashboardEvent[] }>(
  "/api/events",
);

const events = computed(() => eventsData.value?.events ?? []);

const columns: TableColumn<DashboardEvent>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "slug", header: "Public link" },
  { accessorKey: "createdAt", header: "Created" },
  { id: "actions", header: "" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function publicUrl(slug: string) {
  return `/e/${slug}`;
}

// --- Create event form ---

const isCreateModalOpen = ref(false);
const creating = ref(false);

const formState = reactive({
  title: "",
  description: "",
  date: "",
  categories: [] as string[],
});

function resetForm() {
  formState.title = "";
  formState.description = "";
  formState.date = "";
  formState.categories = [];
}

async function onCreateEvent(event: FormSubmitEvent<CreateEvent>) {
  creating.value = true;

  try {
    await $fetch("/api/events", {
      method: "POST",
      body: event.data,
    });

    toast.add({ title: "Event created", color: "success" });
    isCreateModalOpen.value = false;
    resetForm();
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Failed to create event",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
}

// --- Edit event form ---

interface EventCategory {
  id: string;
  name: string;
}

const isEditModalOpen = ref(false);
const editing = ref(false);
const editLoading = ref(false);
const editingEventId = ref<string | null>(null);
// Category names as originally loaded, used to map unchanged tag names back
// to their existing category id when saving (so we update instead of
// recreating them).
const originalCategories = ref<EventCategory[]>([]);

const editFormState = reactive({
  title: "",
  description: "",
  date: "",
  categories: [] as string[],
});

function toDatetimeLocal(value: string) {
  // Stored dates are already `YYYY-MM-DDTHH:mm` (local wall-clock, no
  // timezone) — the same format the datetime-local input produces/expects.
  return value.slice(0, 16);
}

async function openEditModal(row: DashboardEvent) {
  editingEventId.value = row.id;
  isEditModalOpen.value = true;
  editLoading.value = true;

  try {
    const detail = await $fetch<{
      success: boolean;
      event: DashboardEvent;
      categories: EventCategory[];
    }>(`/api/events/${row.id}`);

    editFormState.title = detail.event.title;
    editFormState.description = detail.event.description ?? "";
    editFormState.date = toDatetimeLocal(detail.event.date);
    editFormState.categories = detail.categories.map((c) => c.name);
    originalCategories.value = detail.categories;
  } catch (err: any) {
    toast.add({
      title: "Failed to load event",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
    isEditModalOpen.value = false;
  } finally {
    editLoading.value = false;
  }
}

async function onUpdateEvent(
  event: FormSubmitEvent<v.InferOutput<typeof EditEventFormSchema>>,
) {
  if (!editingEventId.value) return;
  editing.value = true;

  try {
    // Map current tag names back to their original category id when the
    // name is unchanged, so the server updates rather than recreates them.
    const categories = editFormState.categories.map((name) => {
      const existing = originalCategories.value.find((c) => c.name === name);
      return existing ? { id: existing.id, name } : { name };
    });

    await $fetch(`/api/events/${editingEventId.value}`, {
      method: "PUT",
      body: {
        title: editFormState.title,
        description: editFormState.description,
        date: editFormState.date,
        categories,
      } satisfies UpdateEvent,
    });

    toast.add({ title: "Event updated", color: "success" });
    isEditModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Failed to update event",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    editing.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="dashboard-events">
    <template #header>
      <UDashboardNavbar title="My Events" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            @click="isCreateModalOpen = true"
          >
            Create Event
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="pending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="error"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load your events. Please try again later.
          </p>
        </div>

        <UCard v-else>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Your Events</h2>
              <UBadge color="primary" variant="soft">
                {{ events.length }} events
              </UBadge>
            </div>
          </template>

          <div v-if="events.length === 0" class="text-center py-12">
            <p class="text-muted">
              You haven't created any events yet. Click "Create Event" to get
              started.
            </p>
          </div>

          <UTable v-else :data="events" :columns="columns">
            <template #date-cell="{ row }">
              {{ formatDate(row.original.date) }}
            </template>

            <template #slug-cell="{ row }">
              <ULink :to="publicUrl(row.original.slug)" target="_blank">
                {{ publicUrl(row.original.slug) }}
              </ULink>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-sm text-muted">
                {{ formatDate(row.original.createdAt) }}
              </span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-users"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :to="`/dashboard/events/${row.original.id}`"
                >
                  Registrants
                </UButton>
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="openEditModal(row.original)"
                >
                  Edit
                </UButton>
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :to="`/dashboard/event/${row.original.id}`"
                >
                  Manage
                </UButton>
              </div>
            </template>
          </UTable>
        </UCard>
      </div>

      <!-- Create Event Modal -->
      <UModal v-model:open="isCreateModalOpen" title="Create Event">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Create Event</h2>
            </template>

            <UForm
              :schema="CreateEventSchema"
              :state="formState"
              class="space-y-4"
              @submit="onCreateEvent"
            >
              <UFormField label="Title" name="title" required>
                <UInput
                  v-model="formState.title"
                  placeholder="Event title"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea
                  v-model="formState.description"
                  placeholder="Event description"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Date" name="date" required>
                <UInput
                  v-model="formState.date"
                  type="datetime-local"
                  placeholder="Event date"
                />
              </UFormField>

              <UFormField
                label="Categories"
                name="categories"
                hint="Optional"
                help="Add category name and press enter"
              >
                <UInputTags
                  v-model="formState.categories"
                  placeholder="e.g. Girls, Boys"
                  class="w-full"
                />
              </UFormField>

              <div class="flex gap-3 justify-end pt-2">
                <UButton
                  variant="soft"
                  color="neutral"
                  @click="isCreateModalOpen = false"
                >
                  Cancel
                </UButton>
                <UButton type="submit" :loading="creating">
                  Create Event
                </UButton>
              </div>
            </UForm>
          </UCard>
        </template>
      </UModal>

      <!-- Edit Event Modal -->
      <UModal v-model:open="isEditModalOpen" title="Edit Event">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Edit Event</h2>
            </template>

            <div v-if="editLoading" class="space-y-4">
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-24 w-full" />
            </div>

            <UForm
              v-else
              :schema="EditEventFormSchema"
              :state="editFormState"
              class="space-y-4"
              @submit="onUpdateEvent"
            >
              <UFormField label="Title" name="title" required>
                <UInput
                  v-model="editFormState.title"
                  placeholder="Event title"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea
                  v-model="editFormState.description"
                  placeholder="Event description"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Date" name="date" required>
                <UInput
                  v-model="editFormState.date"
                  type="datetime-local"
                  placeholder="Event date"
                />
              </UFormField>

              <UFormField
                label="Categories"
                name="categories"
                hint="Optional"
                help="Add category name and press enter"
              >
                <UInputTags
                  v-model="editFormState.categories"
                  placeholder="e.g. Girls, Boys"
                  class="w-full"
                />
              </UFormField>

              <div class="flex gap-3 justify-end pt-2">
                <UButton
                  variant="soft"
                  color="neutral"
                  @click="isEditModalOpen = false"
                >
                  Cancel
                </UButton>
                <UButton type="submit" :loading="editing">
                  Save Changes
                </UButton>
              </div>
            </UForm>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
