<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import {
  SaveCypherJudgeScoreSchema,
  type SaveCypherJudgeScore,
} from "~~/utils/schemas";

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);
const cypherId = computed(() => route.params.cypherId as string);
const judgeId = computed(() => route.params.judgeId as string);
const judgeName = computed(() => decodeURIComponent(judgeId.value));

interface JudgesEvent {
  id: string;
  title: string;
}

interface JudgesCategory {
  id: string;
  name: string;
}

interface JudgesPhase {
  id: string;
  name: string;
}

interface JudgesCypher {
  id: string;
  cypherIndex: number;
}

interface ScoreParticipant {
  id: number;
  name: string;
  sliderValue: number;
  savedValue: number | null;
  isSaved: boolean;
  groupIndex: number;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  category: JudgesCategory;
  phase: JudgesPhase;
  cypher: JudgesCypher;
  judgeName: string;
  isPhaseStarted: boolean;
  groupSize: number;
  totalSteps: number;
  currentStepIndex: number;
  pendingJudges: string[];
  participants: ScoreParticipant[];
}>(
  () =>
    `/api/cyphers/${cypherId.value}/judges/${encodeURIComponent(judgeName.value)}/scores`,
);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const cypherData = computed(() => data.value?.cypher ?? null);
const isPhaseStarted = computed(() => data.value?.isPhaseStarted ?? false);

const participants = ref<ScoreParticipant[]>([]);
const groupSize = ref(1);
// Total number of `groupSize` groups the cypher's participants are split
// into, and the index of the group every assigned judge must currently be
// scoring. Both are derived server-side from saved scores (see
// `server/utils/cypher-groups.ts`) — `currentStepIndex` only advances once
// *every* judge assigned to this cypher has scored every participant in
// the active group.
const totalSteps = ref(0);
const currentStepIndex = ref(0);
// Judges (other than possibly this one) still missing a score for at least
// one participant in the active group — used to show a "waiting on..."
// banner once this judge has finished their own part of the group.
const pendingJudges = ref<string[]>([]);
// The initial `currentStepIndex` should only be applied once: after that,
// progression is driven exclusively by the `cypher-step-updated` WebSocket
// broadcast so every judge device stays in lockstep.
let hasInitializedStep = false;

// One persistent reactive form-state object per participant (keyed by
// participant id) so `UForm`'s `:state` binding and the slider's `v-model`
// stay stable across re-renders instead of being recreated every render.
const formStates = reactive(new Map<number, SaveCypherJudgeScore>());

watchEffect(() => {
  if (data.value) {
    participants.value = data.value.participants;
    groupSize.value = data.value.groupSize;
    totalSteps.value = data.value.totalSteps;
    pendingJudges.value = data.value.pendingJudges;
    if (!hasInitializedStep) {
      currentStepIndex.value = data.value.currentStepIndex;
      hasInitializedStep = true;
    }
    for (const participant of data.value.participants) {
      formStates.set(participant.id, {
        participantId: participant.id,
        sliderValue: participant.sliderValue,
      });
    }
  }
});

// Only the active group's participants are shown/scored at a time.
const visibleParticipants = computed(() =>
  participants.value.filter(
    (participant) => participant.groupIndex === currentStepIndex.value,
  ),
);

const isJudgingComplete = computed(
  () => totalSteps.value > 0 && currentStepIndex.value >= totalSteps.value,
);

// True once this judge has saved every participant in the active group —
// used to show the "waiting for other judges" banner instead of the
// waiting-on-me state.
const hasSubmittedActiveGroup = computed(
  () =>
    visibleParticipants.value.length > 0 &&
    visibleParticipants.value.every((participant) => participant.isSaved),
);

// --- Real-time step progression -------------------------------------------
// Reuses the existing phase-scoped WebSocket channel (see
// `server/routes/ws/[phaseId].ts`). When the last outstanding judge for the
// active group submits their score, the server broadcasts a
// `cypher-step-updated` message here so every connected judge device for
// this cypher advances to the next group simultaneously, with no manual
// refresh or "next" button needed.
interface CypherStepUpdatedMessage {
  type: "cypher-step-updated";
  phaseId: string;
  cypherId: string;
  currentStepIndex: number;
  totalSteps: number;
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

  let message: CypherStepUpdatedMessage;
  try {
    message = JSON.parse(rawMessage);
  } catch (parseError) {
    console.error("Failed to parse WebSocket message:", parseError);
    return;
  }

  if (
    message.type !== "cypher-step-updated" ||
    message.cypherId !== cypherId.value
  ) {
    return;
  }

  currentStepIndex.value = message.currentStepIndex;
  totalSteps.value = message.totalSteps;
});

const cypherLabel = computed(() =>
  cypherData.value ? `Cypher ${cypherData.value.cypherIndex}` : "Cypher",
);

const breadcrumbItems = useJudgesBreadcrumbs({
  eventId,
  categoryId,
  phaseId,
  cypherId,
  eventLabel: computed(() => eventData.value?.title),
  categoryLabel: computed(() => categoryData.value?.name),
  phaseLabel: computed(() => phaseData.value?.name),
  cypherLabel,
  currentLabel: judgeName.value,
});

useSeoMeta({
  title: () => `${judgeName.value} — ${cypherLabel.value}`,
});

const savingParticipantId = ref<number | null>(null);
const toast = useToast();

async function saveScore(
  participant: ScoreParticipant,
  submitEvent: FormSubmitEvent<SaveCypherJudgeScore>,
) {
  savingParticipantId.value = participant.id;
  try {
    await $fetch(
      `/api/cyphers/${cypherId.value}/judges/${encodeURIComponent(judgeName.value)}/scores`,
      {
        method: "POST",
        body: submitEvent.data,
      },
    );
    participant.sliderValue = submitEvent.data.sliderValue;
    participant.savedValue = submitEvent.data.sliderValue;
    participant.isSaved = true;
  } catch (fetchError: any) {
    toast.add({
      title: "Failed to save score",
      description: fetchError?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    savingParticipantId.value = null;
  }
}

function hasUnsavedChanges(participant: ScoreParticipant) {
  const currentValue = formStates.get(participant.id)?.sliderValue;
  return (
    participant.isSaved &&
    currentValue !== undefined &&
    currentValue !== participant.savedValue
  );
}
</script>

<template>
  <UDashboardPanel id="judges-scoring">
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
        <!-- <UButton
          icon="i-lucide-arrow-left"
          variant="link"
          color="neutral"
          label="Back to judges"
          :to="`/judges/${eventId}/${categoryId}/${phaseId}/${cypherId}`"
        /> -->

        <div v-if="pending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="error || !cypherData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load scoring for this judge. Please try again later.
          </p>
        </div>

        <template v-else>
          <UPageCard
            :title="judgeName"
            :description="`${eventData?.title} — ${categoryData?.name} —
                  ${phaseData?.name} — ${cypherLabel}`"
            variant="naked"
            orientation="horizontal"
            :ui="{ title: 'text-2xl' }"
          >
            <!-- <template #header>
              <div>
                <h2 class="text-lg font-semibold">{{ judgeName }}</h2>
                <p class="text-sm text-muted">
                  {{ eventData?.title }} — {{ categoryData?.name }} —
                  {{ phaseData?.name }} — {{ cypherLabel }}
                </p>
              </div>
            </template> -->
            <UButton
              icon="i-lucide-arrow-left"
              variant="link"
              color="neutral"
              label="Back to judges"
              :to="`/judges/${eventId}/${categoryId}/${phaseId}/${cypherId}`"
              class="w-fit lg:ms-auto"
            />
          </UPageCard>

          <UAlert
            v-if="!isPhaseStarted"
            icon="i-lucide-info"
            color="warning"
            variant="soft"
            title="Evaluation phase not started"
            description="Ask the organizer to start the phase to enable scoring."
          />

          <UAlert
            v-else-if="isJudgingComplete"
            icon="i-lucide-circle-check-big"
            color="success"
            variant="soft"
            title="Judging complete for this cypher"
            description="Every group has been scored by all assigned judges. No further action is needed."
          />

          <template v-else>
            <UAlert
              icon="i-lucide-list-ordered"
              color="primary"
              variant="soft"
              :title="`Group ${currentStepIndex + 1} of ${totalSteps}`"
              description="Score every participant in this group. The next group unlocks automatically for all judges once everyone has submitted."
            />

            <UAlert
              v-if="hasSubmittedActiveGroup && pendingJudges.length > 0"
              icon="i-lucide-clock"
              color="warning"
              variant="soft"
              title="Waiting for other judges"
              :description="`Waiting on: ${pendingJudges.join(', ')} to finish this group.`"
            />
          </template>

          <UCard v-if="!isJudgingComplete">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Participants</h2>
                <UBadge color="primary" variant="soft">
                  {{ visibleParticipants.length }} participants
                </UBadge>
              </div>
            </template>

            <div
              v-if="visibleParticipants.length === 0"
              class="text-center py-12"
            >
              <p class="text-muted">
                No participants are assigned to this group yet.
              </p>
            </div>

            <div v-else class="space-y-5">
              <UPageCard
                v-for="participant in visibleParticipants"
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

                <UForm
                  v-if="formStates.get(participant.id)"
                  :schema="SaveCypherJudgeScoreSchema"
                  :state="formStates.get(participant.id)!"
                  class="flex items-center gap-3 min-w-64"
                  @submit="(submitEvent) => saveScore(participant, submitEvent)"
                >
                  <UFormField name="sliderValue" class="flex-1">
                    <USlider
                      v-model="formStates.get(participant.id)!.sliderValue"
                      :min="0"
                      :max="10"
                      :step="1"
                      :disabled="!isPhaseStarted"
                      :tooltip="{
                        content: { side: 'top' },
                        ui: { content: 'text-xl' },
                      }"
                    />
                  </UFormField>
                  <UButton
                    type="submit"
                    label="Save"
                    icon="i-lucide-save"
                    variant="soft"
                    color="success"
                    :disabled="!isPhaseStarted"
                    :loading="savingParticipantId === participant.id"
                  />
                </UForm>
              </UPageCard>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
