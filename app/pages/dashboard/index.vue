<script setup lang="ts">
import * as v from "valibot";
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
});

function resetForm() {
  formState.title = "";
  formState.description = "";
  formState.date = "";
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
          <p class="text-error">Failed to load your events. Please try again later.</p>
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
                <UInput v-model="formState.title" placeholder="Event title" />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea
                  v-model="formState.description"
                  placeholder="Event description"
                />
              </UFormField>

              <UFormField label="Date" name="date" required>
                <UInput
                  v-model="formState.date"
                  type="datetime-local"
                  placeholder="Event date"
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
    </template>
  </UDashboardPanel>
</template>
