<script setup lang="ts">
import * as v from "valibot";
import type { TableColumn } from "@nuxt/ui";
import {
  CreateEventSchema,
  type UpdateEvent,
} from "~~/utils/schemas";

const EditEventFormSchema = v.object({
  ...v.partial(v.omit(CreateEventSchema, ["categories"])).entries,
  categories: v.optional(v.array(v.string())),
});

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const toast = useToast();

interface EventCategory {
  id: string;
  name: string;
}

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  slug: string;
  createdAt: string;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  categories: EventCategory[];
}>(() => `/api/events/${eventId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const categories = computed(() => data.value?.categories ?? []);
const breadcrumbItems = useDashboardEventBreadcrumbs({
  eventId,
  eventLabel: computed(() => eventData.value?.title),
  currentLabel: "Categories",
});

useSeoMeta({
  title: () =>
    eventData.value ? `${eventData.value.title} — Categories` : "Event",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function publicUrl(slug: string) {
  return `/e/${slug}`;
}

const isEditModalOpen = ref(false);
const editing = ref(false);
const editLoading = ref(false);
const originalCategories = ref<EventCategory[]>([]);

const editFormState = reactive({
  title: "",
  description: "",
  date: "",
  categories: [] as string[],
});

function toDatetimeLocal(value: string) {
  return value.slice(0, 16);
}

async function openEditModal() {
  isEditModalOpen.value = true;
  editLoading.value = true;

  try {
    const detail = await $fetch<{
      success: boolean;
      event: DashboardEvent;
      categories: EventCategory[];
    }>(`/api/events/${eventId.value}`);

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

async function onUpdateEvent() {
  editing.value = true;

  try {
    const categories = editFormState.categories.map((name) => {
      const existing = originalCategories.value.find((c) => c.name === name);
      return existing ? { id: existing.id, name } : { name };
    });

    await $fetch(`/api/events/${eventId.value}`, {
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
    await refreshNuxtData();
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

const columns: TableColumn<EventCategory>[] = [
  { accessorKey: "name", header: "Category" },
  { id: "actions", header: "" },
];
</script>

<template>
  <UDashboardPanel id="dashboard-event-detail">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <UBreadcrumb :items="breadcrumbItems" color="neutral" />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            variant="soft"
            color="neutral"
            to="/dashboard"
          >
            My Events
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton
            label="Participants"
            icon="i-lucide-users"
            color="secondary"
            :to="`/dashboard/events/${eventId}`"
          />
          <UButton
            label="Edit Event"
            icon="i-lucide-pencil"
            color="primary"
            @click="openEditModal"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="pending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="error || !eventData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this event. Please try again later.
          </p>
        </div>

        <template v-else>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold">{{ eventData.title }}</h2>
                  <p class="text-sm text-muted">
                    {{ formatDate(eventData.date) }}
                  </p>
                </div>
                <ULink :to="publicUrl(eventData.slug)" target="_blank">
                  {{ publicUrl(eventData.slug) }}
                </ULink>
              </div>
            </template>

            <p v-if="eventData.description">{{ eventData.description }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Categories</h2>
                <UBadge color="primary" variant="soft">
                  {{ categories.length }} categories
                </UBadge>
              </div>
            </template>

            <div v-if="categories.length === 0" class="text-center py-12">
              <p class="text-muted">No categories added for this event yet.</p>
            </div>

            <UTable v-else :data="categories" :columns="columns">
              <template #actions-cell="{ row }">
                <div class="flex gap-2">
                  <UButton
                    icon="i-lucide-pencil"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    :to="`/dashboard/event/${eventData.id}/category/${row.original.id}`"
                  >
                    Manage
                  </UButton>
                </div>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>

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
