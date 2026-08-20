<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);
const cypherId = computed(() => route.params.cypherId as string);

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
  type: string;
  name: string;
}

interface JudgesCypher {
  id: string;
  cypherIndex: number;
  judges: string[];
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  category: JudgesCategory;
  phase: JudgesPhase;
  isPhaseStarted: boolean;
  cypher: JudgesCypher;
  participants: { id: number; participantName: string }[];
}>(() => `/api/phases/${phaseId.value}/cyphers/${cypherId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const cypherData = computed(() => data.value?.cypher ?? null);
const participants = computed(() => data.value?.participants ?? []);
const isPhaseStarted = computed(() => data.value?.isPhaseStarted ?? false);

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
  currentLabel: "Judges",
});

useSeoMeta({
  title: () => `${cypherLabel.value} — Judges`,
});

function judgeUrl(judgeName: string) {
  return `/judges/${eventId.value}/${categoryId.value}/${phaseId.value}/${cypherId.value}/${encodeURIComponent(judgeName)}`;
}
</script>

<template>
  <UDashboardPanel id="judges-judge-selection">
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
          v-else-if="error || !cypherData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this cypher. Please try again later.
          </p>
        </div>

        <template v-else>
          <UAlert
            v-if="!isPhaseStarted"
            icon="i-lucide-info"
            color="warning"
            variant="soft"
            title="Evaluation phase not started"
            description="Ask the organizer to start this phase before scoring."
          />

          <UPageCard
            :title="cypherLabel"
            description="Who is judging?"
            variant="naked"
            orientation="horizontal"
            :ui="{ title: 'text-2xl' }"
          >
            <!-- <template #description>
              <UBadge color="primary" variant="soft">
                {{ participants.length }} participants
              </UBadge>
            </template> -->

            <UButton
              icon="i-lucide-arrow-left"
              variant="soft"
              color="neutral"
              label="Back to cyphers"
              :to="`/judges/${eventId}/${categoryId}/${phaseId}`"
              class="w-fit lg:ms-auto"
            />
          </UPageCard>

          <div v-if="cypherData.judges.length === 0" class="text-center py-12">
            <p class="text-muted">No judges are assigned to this cypher.</p>
          </div>

          <div v-else class="space-y-3">
            <UPageCard
              v-for="judgeName in cypherData.judges"
              :key="judgeName"
              :title="judgeName"
              orientation="horizontal"
              :to="judgeUrl(judgeName)"
            />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
