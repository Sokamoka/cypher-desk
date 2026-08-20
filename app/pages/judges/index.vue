<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

useSeoMeta({
  title: "Judges — Select Event",
  description: "Pick an event to start judging",
});

interface JudgesEvent {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  events: JudgesEvent[];
}>("/api/events");

const events = computed(() => data.value?.events ?? []);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
</script>

<template>
  <UDashboardPanel id="judges-events">
    <template #header>
      <UDashboardNavbar title="Judges">
        <template #leading>
          <UDashboardSidebarCollapse />
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

        <UPageCard
          v-else
          variant="naked"
          title="Select an event"
          orientation="horizontal"
          :ui="{ title: 'text-2xl' }"
        >
          <template #description>
            <UBadge color="primary" variant="soft">
              {{ events.length }} events
            </UBadge>
          </template>
        </UPageCard>

        <div v-if="events.length === 0" class="text-center py-12">
          <p class="text-muted">You haven't created any events yet.</p>
        </div>

        <div v-else class="space-y-3">
          <UPageCard
            v-for="eventItem in events"
            :key="eventItem.id"
            :title="eventItem.title"
            :description="`${eventItem.location} • ${formatDateRange(eventItem.startDate, eventItem.endDate)}`"
            orientation="horizontal"
            :to="`/judges/${eventItem.id}`"
          >
            <template #trailing>
              <UBadge color="neutral" variant="soft">
                {{ eventItem.judges.length }} judges
              </UBadge>
            </template>
          </UPageCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
