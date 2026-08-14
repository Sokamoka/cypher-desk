<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const phaseId = computed(() => route.params.id as string);

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
</script>

<template>
  <UDashboardPanel id="dashboard-event-result">
    <template #header>
      <UDashboardNavbar
        :title="
          categoryData && phaseData
            ? `${categoryData.name} — ${phaseData.name} Results`
            : 'Results'
        "
      >
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
          v-else-if="error || !eventData || !categoryData || !phaseData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load results. Please try again later.
          </p>
        </div>

        <template v-else>
          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">{{ eventData.title }}</h2>
                <p class="text-sm text-muted">
                  {{ categoryData.name }} — {{ phaseData.name }}
                </p>
              </div>
            </template>
          </UCard>

          <UCard>
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

            <div v-else class="space-y-3">
              <UPageCard
                v-for="participant in results"
                :key="participant.id"
                variant="subtle"
                orientation="horizontal"
                :title="participant.name"
              >
                <template #leading>
                  <UBadge
                    :color="rankColor(participant.rank)"
                    variant="soft"
                    size="lg"
                    class="justify-center w-8"
                  >
                    {{ participant.rank }}
                  </UBadge>
                </template>

                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="participant.score !== null"
                    color="success"
                    variant="subtle"
                    size="lg"
                  >
                    {{ participant.score }} pts
                  </UBadge>
                  <UBadge v-else color="neutral" variant="subtle" size="lg">
                    Not scored
                  </UBadge>
                </div>
              </UPageCard>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
