<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

interface ParticipantResult {
  id: number;
  name: string;
  hasScore: boolean;
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

const route = useRoute();
const eventId = computed(() => route.params.id as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: { id: string; title: string };
  category: { id: string; name: string };
  phase: { id: string; name: string; type: string };
}>(() => `/api/public/phases/${phaseId.value}`);

const {
  data: resultData,
  pending: resultPending,
  error: resultError,
} = await useFetch<{
  success: boolean;
  isPhaseStarted: boolean;
  cyphers: CypherGroup[];
  results: ParticipantResult[];
}>(() => `/api/public/phases/${phaseId.value}/result`);

const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const isPhaseStarted = computed(
  () => resultData.value?.isPhaseStarted ?? false,
);

// `cyphers`/`results` need to be mutable (not computed) so live WebSocket
// updates can patch `hasScore` in place without waiting for a refetch.
const cyphers = ref<CypherGroup[]>([]);
const results = ref<ParticipantResult[]>([]);

watchEffect(() => {
  if (resultData.value) {
    cyphers.value = resultData.value.cyphers;
    results.value = resultData.value.results;
  }
});

const totalParticipants = computed(() =>
  cyphers.value.length > 0
    ? cyphers.value.reduce((sum, cypher) => sum + cypher.results.length, 0)
    : results.value.length,
);

// Sequence-numbers participants in their existing (original data) order.
// No score-based sorting is performed client-side — the public API
// already returns participants in their natural order and never exposes
// the raw score value, only `hasScore`.
function rankResults(participants: ParticipantResult[]) {
  return participants.map((participant, index) => ({
    ...participant,
    rank: index + 1,
  }));
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
    // Patch `hasScore` inside its owning cypher group. The raw
    // `sliderValue` from the WebSocket message is intentionally never
    // stored/displayed — only whether the participant now has a score.
    cyphers.value = cyphers.value.map((cypher) => {
      const hasParticipant = cypher.results.some(
        (participant) => participant.id === message.participantId,
      );
      if (!hasParticipant) return cypher;

      const updated = cypher.results.map((participant) =>
        participant.id === message.participantId
          ? { ...participant, hasScore: true }
          : participant,
      );
      return { ...cypher, results: rankResults(updated) };
    });
    return;
  }

  const updated = results.value.map((participant) =>
    participant.id === message.participantId
      ? { ...participant, hasScore: true }
      : participant,
  );
  results.value = rankResults(updated);
});

const columns: TableColumn<ParticipantResult>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "name", header: "Participant" },
  { accessorKey: "hasScore", header: "Status" },
];
</script>

<template>
  <div class="space-y-4">
    <UButton
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      label="Back to phases"
      :to="`/e/${eventId}/live/${categoryId}`"
    />

    <div v-if="pending || resultPending" class="space-y-4">
      <USkeleton class="h-32 w-full" />
    </div>

    <div
      v-else-if="error || resultError || !categoryData || !phaseData"
      class="text-center py-24"
    >
      <p class="text-muted">This phase could not be found.</p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ categoryData.name }} — {{ phaseData.name }}
        </h2>
        <UBadge color="primary" variant="soft">
          {{ totalParticipants }} participants
        </UBadge>
      </div>

      <UAlert
        v-if="!isPhaseStarted"
        icon="i-lucide-info"
        color="warning"
        variant="soft"
        title="Evaluation not started yet"
        description="Results will appear here once the organizer starts this phase."
      />

      <div
        v-if="totalParticipants === 0"
        class="bg-elevated rounded-lg p-12 text-center"
      >
        <p class="text-muted">No one has registered for this category yet.</p>
      </div>

      <div v-else-if="cyphers.length > 0" class="space-y-4">
        <UCard
          v-for="cypher in cyphers"
          :key="cypher.id"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <h3 class="text-base font-semibold">Cypher {{ cypher.index }}</h3>
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
                color="neutral"
                variant="soft"
                size="lg"
                class="justify-center w-8"
              >
                {{ row.original.rank }}
              </UBadge>
            </template>

            <template #hasScore-cell="{ row }">
              <UBadge
                v-if="row.original.hasScore"
                color="neutral"
                variant="subtle"
                icon="i-lucide-check"
              />
              <UBadge
                v-else
                color="primary"
                variant="subtle"
                icon="i-lucide-clock"
              />
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
              color="neutral"
              variant="soft"
              size="lg"
              class="justify-center w-8"
            >
              {{ row.original.rank }}
            </UBadge>
          </template>

          <template #hasScore-cell="{ row }">
            <UBadge
              v-if="row.original.hasScore"
              color="neutral"
              variant="subtle"
              icon="i-lucide-check"
            />
            <UBadge
              v-else
              color="primary"
              variant="subtle"
              icon="i-lucide-clock"
            />
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
