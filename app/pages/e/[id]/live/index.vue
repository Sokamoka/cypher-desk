<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { PublicEventCategory } from "~/composables/usePublicEvent";

const route = useRoute();
const router = useRouter();
const eventId = computed(() => route.params.id as string);

const { data, pending, error, hasCategories } = usePublicEvent(eventId);
const eventData = computed(() => data.value?.event ?? null);

const categoryColumns: TableColumn<PublicEventCategory>[] = [
  { accessorKey: "name", header: "Category" },
  { id: "participantCount", header: "Participants" },
];

function openCategory(_event: Event, row: { original: PublicEventCategory }) {
  router.push(`/e/${eventId.value}/live/${row.original.id}`);
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <USkeleton class="h-32 w-full" />
  </div>

  <div v-else-if="error || !eventData" class="text-center py-24">
    <p class="text-muted">This event could not be found.</p>
  </div>

  <div v-else-if="hasCategories" class="overflow-x-auto">
    <UTable
      :data="eventData.categories"
      :columns="categoryColumns"
      class="cursor-pointer"
      @select="openCategory"
    >
      <template #participantCount-cell="{ row }">
        {{ row.original.participants.length }}
      </template>
    </UTable>
  </div>
  <p v-else class="text-muted">No categories available.</p>
</template>
