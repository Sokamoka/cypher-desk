<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const openBoardsModal = ref(false);
const route = useRoute();
const eventId = computed(() => route.params.id as string);

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

interface Registration {
  id: number;
  attendeeName: string;
  attendeeEmail: string;
  createdAt: string;
  categories: EventCategory[];
}

interface Boards {
  id: number;
  attendeeName: string;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  categories: EventCategory[];
  registrations: Registration[];
  registrationCount: number;
}>(() => `/api/events/${eventId.value}`);

const tableDataMock: Boards[] = [
  {
    id: 5,
    attendeeName: "Moka",
  },
  {
    id: 7,
    attendeeName: "Bgirl Moka",
  },
];

const eventData = computed(() => data.value?.event ?? null);
const registrations = computed(() => data.value?.registrations ?? []);

useSeoMeta({
  title: () =>
    eventData.value ? `${eventData.value.title} — Registrants` : "Event",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function publicUrl(slug: string) {
  return `/e/${slug}`;
}

const columns: TableColumn<Boards>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Board Type" },
  // { id: "categories", header: "Categories" },
  { accessorKey: "createdAt", header: "Created At" },
  { id: "actions", header: "" },
];
</script>

<template>
  <UDashboardPanel id="dashboard-event-detail">
    <template #header>
      <UDashboardNavbar title="Preselection 1x1 BGirl">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-play" color="success" label="Start phase" />
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
                  <!-- <p class="text-sm text-muted">
                    {{ formatDate(eventData.date) }}
                  </p> -->
                </div>
                <!-- <ULink :to="publicUrl(eventData.slug)" target="_blank">
                  {{ publicUrl(eventData.slug) }}
                </ULink> -->
              </div>
            </template>

            <!-- <p v-if="eventData.description">{{ eventData.description }}</p> -->
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Participants</h2>
                <UBadge color="primary" variant="soft">
                  {{ registrations.length }} board
                </UBadge>
              </div>
            </template>

            <div v-if="registrations.length === 0" class="text-center py-12">
              <p class="text-muted">
                No one has registered for this event yet.
              </p>
            </div>

            <div class="space-y-5">
              <template
                v-for="participant in tableDataMock"
                :key="participant.id"
              >
                <UPageCard
                  variant="subtle"
                  orientation="horizontal"
                  :title="participant.attendeeName"
                >
                  <div class="flex gap-3">
                    <USlider
                      :step="1"
                      :max="10"
                      :default-value="5"
                      :tooltip="{
                        content: { side: 'top' },
                        ui: { content: 'text-xl' },
                      }"
                    />
                    <UButton
                      label="Save"
                      icon="i-lucide-plus"
                      variant="soft"
                      color="success"
                    />
                  </div>
                </UPageCard>
              </template>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
