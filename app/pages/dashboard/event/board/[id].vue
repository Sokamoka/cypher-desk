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

interface Registration {
  id: number;
  participantName: string;
  participantEmail: string;
  createdAt: string;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  category: PhaseCategory;
  phase: Phase;
  registrations: Registration[];
}>(() => `/api/phases/${phaseId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const categoryData = computed(() => data.value?.category ?? null);
const phaseData = computed(() => data.value?.phase ?? null);
const registrations = computed(() => data.value?.registrations ?? []);

useSeoMeta({
  title: () =>
    categoryData.value && phaseData.value
      ? `${categoryData.value.name} — ${phaseData.value.name}`
      : "Board",
});
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
          <UButton icon="i-lucide-play" color="success" label="Start phase" />
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

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Participants</h2>
                <UBadge color="primary" variant="soft">
                  {{ registrations.length }} participants
                </UBadge>
              </div>
            </template>

            <div v-if="registrations.length === 0" class="text-center py-12">
              <p class="text-muted">
                No one has registered for this category yet.
              </p>
            </div>

            <div class="space-y-5">
              <template
                v-for="participant in registrations"
                :key="participant.id"
              >
                <UPageCard
                  variant="subtle"
                  orientation="horizontal"
                  :title="participant.participantName"
                >
                  <div class="flex gap-3">
                    <USlider
                      :step="1"
                      :max="10"
                      :default-value="5"
                      :tooltip="{
                        content: { side: 'top' },
                        ui: { content: 'text-xl' },
                      }"
                    />
                    <UButton
                      label="Save"
                      icon="i-lucide-plus"
                      variant="soft"
                      color="success"
                    />
                  </div>
                </UPageCard>
              </template>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
