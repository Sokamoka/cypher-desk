<script setup lang="ts">
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";
import { CreateEventSchema, type CreateEvent } from "~~/utils/schemas";

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
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
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
  {
    accessorKey: "title",
    header: "Title",
    meta: {
      class: {
        td: "text-lg font-bold",
      },
    },
  },
  { accessorKey: "startDate", header: "Dates" },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "slug", header: "Public link" },
  { accessorKey: "createdAt", header: "Created" },
  { id: "actions", header: "" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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
  location: "",
  startDate: "",
  endDate: "",
  judges: [] as { name: string }[],
  categories: [] as string[],
});

function resetForm() {
  formState.title = "";
  formState.description = "";
  formState.location = "";
  formState.startDate = "";
  formState.endDate = "";
  formState.judges = [];
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
</script>

<template>
  <UDashboardPanel id="dashboard-events">
    <template #header>
      <UDashboardNavbar title="My Events" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <!-- <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            @click="isCreateModalOpen = true"
          >
            Create Event
          </UButton>
        </template> -->
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton
            label="Create Event"
            icon="i-lucide-plus"
            color="success"
            @click="isCreateModalOpen = true"
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
          v-else-if="error"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load your events. Please try again later.
          </p>
        </div>

        <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Events</h2>
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
            <template #startDate-cell="{ row }">
              {{
                formatDateRange(row.original.startDate, row.original.endDate)
              }}
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

            <DashboardEventForm
              :schema="CreateEventSchema"
              :state="formState"
              submit-label="Create Event"
              :submit-loading="creating"
              @submit="onCreateEvent"
              @cancel="isCreateModalOpen = false"
            />
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
