<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
  slug: string;
  createdAt: string;
}

interface PhaseCategory {
  id: string;
  name: string;
}

interface Phase {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  preselection: {
    numberOfCypher: number;
    groupSize: number;
  } | null;
}

interface BoardParticipant {
  id: number;
  name: string;
  sliderValue: number;
  savedValue: number | null;
  isSaved: boolean;
}

interface CypherJudgeScores {
  [judgeName: string]: number | null;
}

interface BoardCypherParticipant {
  id: number;
  name: string;
  scores: CypherJudgeScores;
}

interface BoardCypher {
  id: string;
  index: number;
  judges: string[];
  participants: BoardCypherParticipant[];
}

// Local editable state for a single judge's score on a single participant
// within a cypher — keyed by `${participantId}:${judgeName}` so each
// judge's slider is tracked independently.
interface JudgeScoreState {
  sliderValue: number;
  savedValue: number | null;
  isSaved: boolean;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  category: PhaseCategory;
  phase: Phase;
}>(() => `/api/phases/${phaseId.value}`);

const {
  data: boardData,
  pending: boardPending,
  error: boardError,
} = await useFetch<{
  success: boolean;
  isPhaseStarted: boolean;
  participants: BoardParticipant[];
  cyphers: BoardCypher[];
}>(() => `/api/phases/${phaseId.value}/board`);

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
  currentLabel: "Board",
});

const isPhaseStarted = ref(false);
const participants = ref<BoardParticipant[]>([]);
const cyphers = ref<BoardCypher[]>([]);

// `${participantId}:${judgeName}` -> editable slider state for that pair.
const judgeScores = reactive(new Map<string, JudgeScoreState>());

function judgeScoreKey(participantId: number, judgeName: string) {
  return `${participantId}:${judgeName}`;
}

function seedJudgeScores(cypherList: BoardCypher[]) {
  judgeScores.clear();
  for (const cypher of cypherList) {
    for (const participant of cypher.participants) {
      for (const judgeName of cypher.judges) {
        const savedValue = participant.scores[judgeName] ?? null;
        judgeScores.set(judgeScoreKey(participant.id, judgeName), {
          sliderValue: savedValue ?? 5,
          savedValue,
          isSaved: savedValue !== null,
        });
      }
    }
  }
}

watchEffect(() => {
  if (boardData.value) {
    isPhaseStarted.value = boardData.value.isPhaseStarted;
    participants.value = boardData.value.participants;
    cyphers.value = boardData.value.cyphers;
    seedJudgeScores(boardData.value.cyphers);
  }
});

const isStartingPhase = ref(false);
const savingParticipantId = ref<number | null>(null);
const savingJudgeScoreKey = ref<string | null>(null);

useSeoMeta({
  title: () =>
    categoryData.value && phaseData.value
      ? `${categoryData.value.name} — ${phaseData.value.name}`
      : "Board",
});

async function startPhase() {
  isStartingPhase.value = true;
  try {
    const response = await $fetch<{
      success: boolean;
      isPhaseStarted: boolean;
    }>(`/api/phases/${phaseId.value}/board/start`, { method: "POST" });
    isPhaseStarted.value = response.isPhaseStarted;
  } catch (fetchError) {
    console.error("Failed to start phase:", fetchError);
  } finally {
    isStartingPhase.value = false;
  }
}

async function saveScore(participant: BoardParticipant) {
  savingParticipantId.value = participant.id;
  try {
    await $fetch(`/api/phases/${phaseId.value}/board`, {
      method: "POST",
      body: {
        participantId: participant.id,
        sliderValue: participant.sliderValue,
      },
    });
    participant.savedValue = participant.sliderValue;
    participant.isSaved = true;
  } catch (fetchError) {
    console.error("Failed to save score:", fetchError);
  } finally {
    savingParticipantId.value = null;
  }
}

function hasUnsavedChanges(participant: BoardParticipant) {
  return (
    participant.isSaved && participant.sliderValue !== participant.savedValue
  );
}

const totalCypherParticipants = computed(() =>
  cyphers.value.reduce((sum, cypher) => sum + cypher.participants.length, 0),
);

function judgeState(participantId: number, judgeName: string) {
  const key = judgeScoreKey(participantId, judgeName);
  const state = judgeScores.get(key);
  if (state) return state;

  // Should always be seeded by `seedJudgeScores`, but fall back defensively
  // so the template never dereferences `undefined`.
  const fallback: JudgeScoreState = {
    sliderValue: 5,
    savedValue: null,
    isSaved: false,
  };
  judgeScores.set(key, fallback);
  return fallback;
}

function hasUnsavedJudgeChanges(participantId: number, judgeName: string) {
  const state = judgeState(participantId, judgeName);
  return state.isSaved && state.sliderValue !== state.savedValue;
}

async function saveJudgeScore(
  cypher: BoardCypher,
  participant: BoardCypherParticipant,
  judgeName: string,
) {
  const key = judgeScoreKey(participant.id, judgeName);
  const state = judgeState(participant.id, judgeName);

  savingJudgeScoreKey.value = key;
  try {
    await $fetch(
      `/api/cyphers/${cypher.id}/judges/${encodeURIComponent(judgeName)}/scores`,
      {
        method: "POST",
        body: {
          participantId: participant.id,
          sliderValue: state.sliderValue,
        },
      },
    );
    state.savedValue = state.sliderValue;
    state.isSaved = true;
  } catch (fetchError) {
    console.error("Failed to save judge score:", fetchError);
  } finally {
    savingJudgeScoreKey.value = null;
  }
}
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
          <UButton
            icon="i-lucide-play"
            color="success"
            label="Start phase"
            :disabled="isPhaseStarted"
            :loading="isStartingPhase"
            @click="startPhase"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="pending || boardPending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="
            error || boardError || !eventData || !categoryData || !phaseData
          "
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this board. Please try again later.
          </p>
        </div>

        <template v-else>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold">{{ eventData.title }}</h2>
                  <p class="text-sm text-muted">
                    {{ categoryData.name }} — {{ phaseData.name }}
                  </p>
                </div>
              </div>
            </template>
          </UCard>

          <UAlert
            v-if="!isPhaseStarted"
            icon="i-lucide-info"
            color="warning"
            variant="soft"
            title="Evaluation phase not started"
            description="Start the phase to enable slider adjustments and saving scores."
          />

          <div v-if="cyphers.length > 0" class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Participants by Cypher</h2>
              <UBadge color="primary" variant="soft">
                {{ totalCypherParticipants }} participants
              </UBadge>
            </div>

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

              <div
                v-if="cypher.participants.length === 0"
                class="text-center py-8"
              >
                <p class="text-muted">No participants in this cypher.</p>
              </div>

              <div v-else class="divide-y divide-default">
                <div
                  v-for="participant in cypher.participants"
                  :key="participant.id"
                  class="p-4 space-y-3"
                >
                  <p class="font-medium">{{ participant.name }}</p>

                  <div class="flex flex-col gap-3">
                    <div
                      v-for="judge in cypher.judges"
                      :key="judge"
                      class="flex items-center gap-3 min-w-64 flex-wrap"
                    >
                      <span class="text-sm text-muted w-28 shrink-0">{{
                        judge
                      }}</span>
                      <UInputNumber
                        v-model="judgeState(participant.id, judge).sliderValue"
                        :min="0"
                        :max="10"
                        :step="1"
                        :disabled="!isPhaseStarted"
                        :tooltip="{
                          content: { side: 'top' },
                          ui: { content: 'text-xl' },
                        }"
                        class="flex-1"
                      />
                      <UButton
                        label="Save"
                        icon="i-lucide-save"
                        variant="soft"
                        color="success"
                        size="sm"
                        :disabled="!isPhaseStarted"
                        :loading="
                          savingJudgeScoreKey ===
                          `${participant.id}:${judge}`
                        "
                        @click="saveJudgeScore(cypher, participant, judge)"
                      />
                      <UBadge
                        v-if="
                          judgeState(participant.id, judge).isSaved &&
                          !hasUnsavedJudgeChanges(participant.id, judge)
                        "
                        color="success"
                        variant="subtle"
                        icon="i-lucide-check"
                      >
                        Saved
                      </UBadge>
                      <UBadge
                        v-else-if="
                          hasUnsavedJudgeChanges(participant.id, judge)
                        "
                        color="warning"
                        variant="subtle"
                        icon="i-lucide-circle-alert"
                      >
                        Unsaved changes
                      </UBadge>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <UCard v-else>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Participants</h2>
                <UBadge color="primary" variant="soft">
                  {{ participants.length }} participants
                </UBadge>
              </div>
            </template>

            <div v-if="participants.length === 0" class="text-center py-12">
              <p class="text-muted">
                No one has registered for this category yet.
              </p>
            </div>

            <div v-else class="space-y-5">
              <UPageCard
                v-for="participant in participants"
                :key="participant.id"
                variant="subtle"
                orientation="horizontal"
                :title="participant.name"
              >
                <template #description>
                  <div class="flex items-center gap-2 mt-1">
                    <UBadge
                      v-if="
                        participant.isSaved && !hasUnsavedChanges(participant)
                      "
                      color="success"
                      variant="subtle"
                      icon="i-lucide-check"
                    >
                      Saved
                    </UBadge>
                    <UBadge
                      v-else-if="hasUnsavedChanges(participant)"
                      color="warning"
                      variant="subtle"
                      icon="i-lucide-circle-alert"
                    >
                      Unsaved changes
                    </UBadge>
                  </div>
                </template>

                <div class="flex items-center gap-3 min-w-64">
                  <UInputNumber
                    v-model="participant.sliderValue"
                    :min="0"
                    :max="10"
                    :step="1"
                    :disabled="!isPhaseStarted"
                    :tooltip="{
                      content: { side: 'top' },
                      ui: { content: 'text-xl' },
                    }"
                    class="flex-1"
                  />
                  <UButton
                    label="Save"
                    icon="i-lucide-save"
                    variant="soft"
                    color="success"
                    :disabled="!isPhaseStarted"
                    :loading="savingParticipantId === participant.id"
                    @click="saveScore(participant)"
                  />
                </div>
              </UPageCard>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
