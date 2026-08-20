<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const categoryId = computed(() => route.params.categoryId as string);
const phaseId = computed(() => route.params.phaseId as string);

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

interface PhaseCypher {
  id: string;
  cypherIndex: number;
  judges: string[];
  participantCount: number;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: JudgesEvent;
  category: JudgesCategory;
  phase: JudgesPhase;
  isPhaseStarted: boolean;
  cyphers: PhaseCypher[];
}>(() => `/api/phases/${phaseId.value}/cyphers`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const cyphers = computed(() => data.value?.cyphers ?? []);
const isPhaseStarted = computed(() => data.value?.isPhaseStarted ?? false);

const breadcrumbItems = useJudgesBreadcrumbs({
  eventId,
  categoryId,
  phaseId,
  eventLabel: computed(() => eventData.value?.title),
  categoryLabel: computed(() => categoryData.value?.name),
  phaseLabel: computed(() => phaseData.value?.name),
  currentLabel: "Cyphers",
});

useSeoMeta({
  title: () =>
    phaseData.value ? `${phaseData.value.name} — Judges` : "Judges",
});
</script>

<template>
  <UDashboardPanel id="judges-cyphers">
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
          v-else-if="error || !phaseData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this phase. Please try again later.
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
            :title="phaseData.name"
            description="Select a cypher to continue"
            variant="naked"
            orientation="horizontal"
            :ui="{ title: 'text-2xl' }"
          >
            <UButton
              icon="i-lucide-arrow-left"
              variant="soft"
              color="neutral"
              label="Back to phases"
              :to="`/judges/${eventId}/${categoryId}`"
              class="w-fit lg:ms-auto"
            />
          </UPageCard>

          <div v-if="cyphers.length === 0" class="text-center py-12">
            <p class="text-muted">
              No cyphers are available for this phase yet.
            </p>
          </div>

          <div v-else class="space-y-3">
            <UPageCard
              v-for="cypher in cyphers"
              :key="cypher.id"
              :title="`Cypher ${cypher.cypherIndex}`"
              :description="`${cypher.participantCount} participant(s)`"
              orientation="horizontal"
              :to="`/judges/${eventId}/${categoryId}/${phaseId}/${cypher.id}`"
            >
              <template #trailing>
                <UBadge color="neutral" variant="soft">
                  {{ cypher.judges.length }} judges
                </UBadge>
              </template>
            </UPageCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
