<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);

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
  participantName: string;
  participantEmail: string;
  createdAt: string;
  categories: EventCategory[];
}

const { data, pending, error, execute } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  categories: EventCategory[];
  registrations: Registration[];
  registrationCount: number;
}>(() => `/api/events/${eventId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const registrations = computed(() => data.value?.registrations ?? []);
const breadcrumbItems = useDashboardEventBreadcrumbs({
  eventId,
  eventLabel: computed(() => eventData.value?.title),
  currentLabel: "Participants",
});

useSeoMeta({
  title: () =>
    eventData.value ? `${eventData.value.title} — Registrants` : "Event",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function onRefresh() {
  execute();
}

const columns: TableColumn<Registration>[] = [
  {
    accessorKey: "participantName",
    header: "Name",
    meta: {
      class: {
        td: "font-bold",
      },
    },
  },
  { accessorKey: "participantEmail", header: "Email" },
  { id: "categories", header: "Categories" },
  { accessorKey: "createdAt", header: "Registered At" },
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
          <!-- <UButton
            icon="i-lucide-arrow-left"
            variant="soft"
            color="neutral"
            :to="`/dashboard/event/${eventId}`"
          >
            Back to Event
          </UButton> -->
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-ccw"
            variant="subtle"
            color="neutral"
            @click="onRefresh"
          />
          <UButton
            label="Add new Participant"
            icon="i-lucide-plus"
            variant="solid"
            color="success"
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
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Participants</h2>
                <UBadge color="primary" variant="soft">
                  {{ registrations.length }} registrations
                </UBadge>
              </div>
            </template>

            <div v-if="registrations.length === 0" class="text-center py-12">
              <p class="text-muted">
                No one has registered for this event yet.
              </p>
            </div>

            <UTable v-else :data="registrations" :columns="columns">
              <template #categories-cell="{ row }">
                <div
                  v-if="row.original.categories.length > 0"
                  class="flex flex-wrap gap-1"
                >
                  <UBadge
                    v-for="category in row.original.categories"
                    :key="category.id"
                    variant="subtle"
                    color="neutral"
                  >
                    {{ category.name }}
                  </UBadge>
                </div>
                <span v-else class="text-muted text-sm">—</span>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">
                  {{ formatDate(row.original.createdAt) }}
                </span>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
