<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);

interface ResultEvent {
  id: string;
  title: string;
}

interface ResultCategory {
  id: string;
  name: string;
}

interface ResultPhase {
  id: string;
  name: string;
}

interface ParticipantResult {
  id: number;
  name: string;
  score: number | null;
  rank: number;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: ResultEvent;
  category: ResultCategory;
  phase: ResultPhase;
  results: ParticipantResult[];
}>(() => `/api/phases/${phaseId.value}/result`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const results = computed(() => data.value?.results ?? []);
const breadcrumbItems = useDashboardEventBreadcrumbs({
  eventId,
  categoryId,
  phaseId,
  eventLabel: computed(() => eventData.value?.title),
  categoryLabel: computed(() => categoryData.value?.name),
  phaseLabel: computed(() => phaseData.value?.name),
  currentLabel: "Results",
});

useSeoMeta({
  title: () =>
    categoryData.value && phaseData.value
      ? `${categoryData.value.name} — ${phaseData.value.name} Results`
      : "Results",
});

function rankColor(rank: number) {
  if (rank === 1) return "warning";
  if (rank === 2) return "neutral";
  if (rank === 3) return "error";
  return "neutral";
}

const columns: TableColumn<ParticipantResult>[] = [
  { accessorKey: "rank", header: "Rank" },
  { accessorKey: "name", header: "Participant" },
  { accessorKey: "score", header: "Score" },
];
</script>

<template>
  <UDashboardPanel id="dashboard-event-result">
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
          v-else-if="error || !eventData || !categoryData || !phaseData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load results. Please try again later.
          </p>
        </div>

        <template v-else>
          <!-- <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">{{ eventData.title }}</h2>
                <p class="text-sm text-muted">
                  {{ categoryData.name }} — {{ phaseData.name }}
                </p>
              </div>
            </template>
          </UCard> -->

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Results</h2>
                <UBadge color="primary" variant="soft">
                  {{ results.length }} participants
                </UBadge>
              </div>
            </template>

            <div v-if="results.length === 0" class="text-center py-12">
              <p class="text-muted">
                No one has registered for this category yet.
              </p>
            </div>

            <UTable v-else :data="results" :columns="columns">
              <template #rank-cell="{ row }">
                <UBadge
                  :color="rankColor(row.original.rank)"
                  variant="soft"
                  size="lg"
                  class="justify-center w-8"
                >
                  {{ row.original.rank }}
                </UBadge>
              </template>

              <template #score-cell="{ row }">
                <UBadge
                  v-if="row.original.score !== null"
                  color="success"
                  variant="subtle"
                >
                  {{ row.original.score }} pts
                </UBadge>
                <UBadge v-else color="neutral" variant="subtle">
                  Not scored
                </UBadge>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
