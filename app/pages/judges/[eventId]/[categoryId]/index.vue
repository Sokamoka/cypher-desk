<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);

interface JudgesEvent {
  id: string;
  title: string;
}

interface JudgesCategory {
  id: string;
  name: string;
  phases: CategoryPhase[];
}

interface CategoryPhase {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  preselection: {
    numberOfCypher: number;
    groupSize: number;
  } | null;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  category: JudgesCategory;
}>(() => `/api/categories/${categoryId.value}/phases`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);

// Cyphers and per-cypher judge assignments only exist for preselection
// phases, so only those are eligible for judging. `phases` is nested under
// `category` in the API response, not top-level.
const phases = computed(() =>
  (data.value?.category?.phases ?? []).filter(
    (phase) => phase.type === "preselection",
  ),
);

const breadcrumbItems = useJudgesBreadcrumbs({
  eventId,
  categoryId,
  eventLabel: computed(() => eventData.value?.title),
  categoryLabel: computed(() => categoryData.value?.name),
  currentLabel: "Phases",
});

useSeoMeta({
  title: () =>
    categoryData.value ? `${categoryData.value.name} — Judges` : "Judges",
});
</script>

<template>
  <UDashboardPanel id="judges-phases">
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
        <UButton
          icon="i-lucide-arrow-left"
          variant="link"
          color="neutral"
          label="Back to categories"
          :to="`/judges/${eventId}`"
        />

        <div v-if="pending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="error || !categoryData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this category. Please try again later.
          </p>
        </div>

        <UCard v-else>
          <template #header>
            <div>
              <h2 class="text-lg font-semibold">{{ categoryData.name }}</h2>
              <p class="text-sm text-muted">
                Select a preselection phase to continue
              </p>
            </div>
          </template>

          <div v-if="phases.length === 0" class="text-center py-12">
            <p class="text-muted">
              No preselection phases are available for judging yet.
            </p>
          </div>

          <div v-else class="space-y-3">
            <UPageCard
              v-for="phase in phases"
              :key="phase.id"
              :title="phase.name"
              :description="
                phase.preselection
                  ? `${phase.preselection.numberOfCypher} cypher(s)`
                  : undefined
              "
              orientation="horizontal"
              :to="`/judges/${eventId}/${categoryId}/${phase.id}`"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
