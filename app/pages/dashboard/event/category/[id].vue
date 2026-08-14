<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui";

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
});

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  slug: string;
  createdAt: string;
}

interface CategoryPhase {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  preselection: {
    numberOfCypher: number;
    groupSize: number;
    categoryRegistrations: {
      id: number;
      attendeeName: string;
      attendeeEmail: string;
      createdAt: string;
    }[];
  } | null;
}

interface CategoryWithPhases {
  id: string;
  name: string;
  createdAt: string;
  phases: CategoryPhase[];
}

interface PhaseTableRow {
  id: string;
  categoryName: string;
  name: string;
  type: string;
  participants: number;
  createdAt: string;
}

const route = useRoute();
const categoryId = computed(() => route.params.id as string);
const openPreselectionModal = ref(false);

const { data, pending, error, refresh } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  category: CategoryWithPhases;
}>(() => `/api/categories/${categoryId.value}/phases`);

const eventData = computed(() => data.value?.event ?? null);
const selectedCategory = computed(() => data.value?.category ?? null);
const selectedEventId = computed(() => eventData.value?.id ?? "");
const selectedCategoryId = computed(() => selectedCategory.value?.id ?? "");

const phaseRows = computed<PhaseTableRow[]>(() =>
  (selectedCategory.value?.phases ?? []).map((phase) => ({
    id: phase.id,
    categoryName: selectedCategory.value?.name ?? "",
    name: phase.name,
    type: phase.type,
    participants: phase.preselection?.categoryRegistrations.length ?? 0,
    createdAt: phase.createdAt,
  })),
);

const boardItems = ref<DropdownMenuItem[]>([
  {
    label: "Preselection",
    icon: "i-lucide-user",
    onClick: () => (openPreselectionModal.value = true),
  },
  {
    label: "Bracket",
    icon: "i-lucide-credit-card",
  },
]);

useSeoMeta({
  title: () =>
    eventData.value && selectedCategory.value
      ? `${eventData.value.title} — ${selectedCategory.value.name}`
      : "Phases",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function onPreselectionCreated() {
  openPreselectionModal.value = false;
  refresh();
}

const columns: TableColumn<PhaseTableRow>[] = [
  { accessorKey: "categoryName", header: "Category" },
  { accessorKey: "name", header: "Phase Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "participants", header: "Category Registrations" },
  { accessorKey: "createdAt", header: "Created At" },
  { id: "actions", header: "" },
];
</script>

<template>
  <UDashboardPanel id="dashboard-event-phases">
    <template #header>
      <UDashboardNavbar title="Phases">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UDropdownMenu
            :items="boardItems"
            :content="{
              align: 'end',
              side: 'bottom',
              sideOffset: 8,
            }"
            :ui="{
              content: 'w-48',
            }"
          >
            <UButton icon="i-lucide-plus" variant="soft" color="success">
              Add board
            </UButton>
          </UDropdownMenu>
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
          v-else-if="error || !eventData || !selectedCategory"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this event. Please try again later.
          </p>
        </div>

        <template v-else>
          <UPageCard
            :title="eventData.title"
            :description="selectedCategory.name"
            variant="solid"
          />

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Category Phases</h2>
                <UBadge color="primary" variant="soft">
                  {{ phaseRows.length }} phases
                </UBadge>
              </div>
            </template>

            <div v-if="phaseRows.length === 0" class="text-center py-12">
              <p class="text-muted">
                No phases created yet. Use "Add Preselection" to create one.
              </p>
            </div>

            <UTable v-else :data="phaseRows" :columns="columns">
              <template #type-cell="{ row }">
                <UBadge color="neutral" variant="subtle">
                  {{ row.original.type }}
                </UBadge>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">
                  {{ formatDate(row.original.createdAt) }}
                </span>
              </template>

              <template #actions-cell="{ row }">
                <UButton
                  icon="i-lucide-arrow-right"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :to="`/dashboard/event/board/${row.original.id}`"
                >
                  Manage board
                </UButton>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>

      <UModal
        v-model:open="openPreselectionModal"
        title="Create Preselection"
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <DashboardPreselectionForm
            id="preselection"
            :event-id="selectedEventId"
            :category-id="selectedCategoryId"
            @submitted="onPreselectionCreated"
          />
        </template>

        <template #footer="{ close }">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="close"
          />
          <UButton
            form="preselection"
            type="submit"
            label="Create"
            color="primary"
          />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
