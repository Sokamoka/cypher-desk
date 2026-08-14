<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const phaseId = computed(() => route.params.id as string);

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
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
}>(() => `/api/phases/${phaseId.value}/board`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);

const isPhaseStarted = ref(false);
const participants = ref<BoardParticipant[]>([]);

watchEffect(() => {
  if (boardData.value) {
    isPhaseStarted.value = boardData.value.isPhaseStarted;
    participants.value = boardData.value.participants;
  }
});

const isStartingPhase = ref(false);
const savingParticipantId = ref<number | null>(null);

useSeoMeta({
  title: () =>
    categoryData.value && phaseData.value
      ? `${categoryData.value.name} — ${phaseData.value.name}`
      : "Board",
});

async function startPhase() {
  isStartingPhase.value = true;
  try {
    const response = await $fetch<{ success: boolean; isPhaseStarted: boolean }>(
      `/api/phases/${phaseId.value}/board/start`,
      { method: "POST" },
    );
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
  return participant.isSaved && participant.sliderValue !== participant.savedValue;
}
</script>

<template>
  <UDashboardPanel id="dashboard-event-detail">
    <template #header>
      <UDashboardNavbar
        :title="
          categoryData && phaseData
            ? `${categoryData.name} — ${phaseData.name}`
            : 'Board'
        "
      >
        <template #leading>
          <UDashboardSidebarCollapse />
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
          v-else-if="error || boardError || !eventData || !categoryData || !phaseData"
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

          <UCard>
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
                      v-if="participant.isSaved && !hasUnsavedChanges(participant)"
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
                  <USlider
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
