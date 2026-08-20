<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);

interface JudgesEvent {
  id: string;
  title: string;
  location: string;
}

interface EventCategory {
  id: string;
  name: string;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  categories: EventCategory[];
}>(() => `/api/events/${eventId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const categories = computed(() => data.value?.categories ?? []);

const breadcrumbItems = useJudgesBreadcrumbs({
  eventId,
  eventLabel: computed(() => eventData.value?.title),
  currentLabel: "Categories",
});

useSeoMeta({
  title: () =>
    eventData.value ? `${eventData.value.title} — Judges` : "Judges",
});
</script>

<template>
  <UDashboardPanel id="judges-categories">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <UBreadcrumb :items="breadcrumbItems" color="neutral" />
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

        <UPageCard
          v-else
          variant="naked"
          :title="eventData.title"
          description="Select a category to continue"
          orientation="horizontal"
          :ui="{ title: 'text-2xl' }"
        >
          <UButton
            icon="i-lucide-arrow-left"
            variant="soft"
            color="neutral"
            label="Back to events"
            to="/judges"
            class="w-fit lg:ms-auto"
          />
        </UPageCard>

        <div v-if="categories.length === 0" class="text-center py-12">
          <p class="text-muted">This event has no categories yet.</p>
        </div>

        <div v-else class="space-y-3">
          <UPageCard
            v-for="category in categories"
            :key="category.id"
            :title="category.name"
            orientation="horizontal"
            :to="`/judges/${eventId}/${category.id}`"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
