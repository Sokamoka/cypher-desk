<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

interface PhaseResult {
  id: number;
  name: string;
  score: number | null;
  rank: number;
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
  results: PhaseResult[];
}>(() => `/api/public/phases/${phaseId.value}/result`);

const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const isPhaseStarted = computed(() => resultData.value?.isPhaseStarted ?? false);
const results = computed(() => resultData.value?.results ?? []);

const resultColumns: TableColumn<PhaseResult>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "name", header: "Participant" },
  { accessorKey: "score", header: "Score" },
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

    <UCard v-else variant="soft">
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ categoryData.name }} — {{ phaseData.name }}
        </h2>
      </template>

      <UAlert
        v-if="!isPhaseStarted"
        icon="i-lucide-info"
        color="warning"
        variant="soft"
        title="Evaluation not started yet"
        description="Results will appear here once the organizer starts this phase."
        class="mb-4"
      />

      <div v-if="results.length === 0" class="text-center py-8">
        <p class="text-muted">No participants registered for this phase yet.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <UTable :data="results" :columns="resultColumns">
          <template #score-cell="{ row }">
            <span v-if="row.original.score !== null">{{
              row.original.score
            }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </UTable>
      </div>
    </UCard>
  </div>
</template>
