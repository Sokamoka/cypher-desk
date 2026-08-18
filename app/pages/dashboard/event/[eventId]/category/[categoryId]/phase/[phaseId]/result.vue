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

interface CypherGroup {
  id: string;
  index: number;
  judges: string[];
  results: ParticipantResult[];
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
  cyphers: CypherGroup[];
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

// `cyphers`/`results` need to be mutable (not computed) so live WebSocket
// updates can patch scores in place without waiting for a refetch.
const cyphers = ref<CypherGroup[]>([]);
const results = ref<ParticipantResult[]>([]);

watchEffect(() => {
  if (data.value) {
    cyphers.value = data.value.cyphers;
    results.value = data.value.results;
  }
});

const totalParticipants = computed(() =>
  cyphers.value.length > 0
    ? cyphers.value.reduce((sum, cypher) => sum + cypher.results.length, 0)
    : results.value.length,
);

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

  if (cyphers.value.length > 0) {
    // Patch the score inside its owning cypher group and re-rank only that
    // group, since ranking is computed independently per cypher.
    cyphers.value = cyphers.value.map((cypher) => {
      const hasParticipant = cypher.results.some(
        (participant) => participant.id === message.participantId,
      );
      if (!hasParticipant) return cypher;

      const updated = cypher.results.map((participant) =>
        participant.id === message.participantId
          ? { ...participant, score: message.sliderValue }
          : participant,
      );
      return { ...cypher, results: rankResults(updated) };
    });
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

          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Results</h2>
            <UBadge color="primary" variant="soft">
              {{ totalParticipants }} participants
            </UBadge>
          </div>

          <div
            v-if="totalParticipants === 0"
            class="bg-elevated rounded-lg p-12 text-center"
          >
            <p class="text-muted">
              No one has registered for this category yet.
            </p>
          </div>

          <div v-else-if="cyphers.length > 0" class="space-y-4">
            <UCard
              v-for="cypher in cyphers"
              :key="cypher.id"
              :ui="{ body: 'p-0 sm:p-0' }"
            >
              <template #header>
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <h3 class="text-base font-semibold">
                    Cypher {{ cypher.index }}
                  </h3>
                  <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-xs text-muted mr-1">Judges:</span>
                    <UBadge
                      v-for="judge in cypher.judges"
                      :key="judge"
                      color="neutral"
                      variant="subtle"
                      size="sm"
                    >
                      {{ judge }}
                    </UBadge>
                  </div>
                </div>
              </template>

              <div v-if="cypher.results.length === 0" class="text-center py-8">
                <p class="text-muted">No participants in this cypher.</p>
              </div>

              <UTable v-else :data="cypher.results" :columns="columns">
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
          </div>

          <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <h2 class="text-lg font-semibold">Results</h2>
            </template>

            <UTable :data="results" :columns="columns">
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
