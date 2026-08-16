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

interface ScoreUpdatedMessage {
  type: "score-updated";
  eventId: string;
  categoryId: string;
  phaseId: string;
  participantId: number;
  sliderValue: number;
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
const breadcrumbItems = useDashboardEventBreadcrumbs({
  eventId,
  categoryId,
  phaseId,
  eventLabel: computed(() => eventData.value?.title),
  categoryLabel: computed(() => categoryData.value?.name),
  phaseLabel: computed(() => phaseData.value?.name),
  currentLabel: "Results",
});

// `results` needs to be mutable (not a computed) so live WebSocket updates
// can patch scores in place without waiting for a refetch.
const results = ref<ParticipantResult[]>([]);

watchEffect(() => {
  if (data.value) {
    results.value = data.value.results;
  }
});

// Ranks participants the same way `server/api/phases/[id]/result.get.ts`
// does: highest score first, unscored participants last (alphabetically
// among themselves). Kept in sync manually since the sort also runs
// server-side on initial load.
function rankResults(participants: ParticipantResult[]) {
  return [...participants]
    .sort((a, b) => {
      if (a.score === null && b.score === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    })
    .map((participant, index) => ({ ...participant, rank: index + 1 }));
}

const wsUrl = computed(() => {
  if (import.meta.server) return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/${phaseId.value}`;
});

const { data: wsData } = useWebSocket(wsUrl, {
  autoReconnect: true,
  immediate: true,
});

watch(wsData, (rawMessage) => {
  if (!rawMessage) return;

  let message: ScoreUpdatedMessage;
  try {
    message = JSON.parse(rawMessage);
  } catch (parseError) {
    console.error("Failed to parse WebSocket message:", parseError);
    return;
  }

  if (message.type !== "score-updated" || message.phaseId !== phaseId.value) {
    return;
  }

  const updated = results.value.map((participant) =>
    participant.id === message.participantId
      ? { ...participant, score: message.sliderValue }
      : participant,
  );
  results.value = rankResults(updated);
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
