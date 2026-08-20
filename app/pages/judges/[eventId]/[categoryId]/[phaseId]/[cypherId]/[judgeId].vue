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
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  category: JudgesCategory;
  phase: JudgesPhase;
  cypher: JudgesCypher;
  judgeName: string;
  isPhaseStarted: boolean;
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
// One persistent reactive form-state object per participant (keyed by
// participant id) so `UForm`'s `:state` binding and the slider's `v-model`
// stay stable across re-renders instead of being recreated every render.
const formStates = reactive(new Map<number, SaveCypherJudgeScore>());

watchEffect(() => {
  if (data.value) {
    participants.value = data.value.participants;
    for (const participant of data.value.participants) {
      formStates.set(participant.id, {
        participantId: participant.id,
        sliderValue: participant.sliderValue,
      });
    }
  }
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
                No participants are assigned to this cypher yet.
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
