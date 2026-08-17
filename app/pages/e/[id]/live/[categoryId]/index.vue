<script setup lang="ts">
interface CategoryPhase {
  id: string;
  type: string;
  name: string;
  createdAt: string;
}

const route = useRoute();
const eventId = computed(() => route.params.id as string);
const categoryId = computed(() => route.params.categoryId as string);

const { data, pending, error } = await useFetch<{
  success: boolean;
  category: { id: string; name: string };
  phases: CategoryPhase[];
}>(() => `/api/public/events/${eventId.value}/categories/${categoryId.value}`);

const categoryData = computed(() => data.value?.category ?? null);
const phases = computed(() => data.value?.phases ?? []);
</script>

<template>
  <div class="space-y-4">
    <UButton
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      label="Back to categories"
      :to="`/e/${eventId}/live`"
    />

    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-32 w-full" />
    </div>

    <div v-else-if="error || !categoryData" class="text-center py-24">
      <p class="text-muted">This category could not be found.</p>
    </div>

    <UCard v-else variant="soft">
      <template #header>
        <h2 class="text-lg font-semibold">{{ categoryData.name }}</h2>
      </template>

      <div v-if="phases.length === 0" class="text-center py-8">
        <p class="text-muted">No phases available yet.</p>
      </div>

      <div v-else class="space-y-3">
        <UPageCard
          v-for="phase in phases"
          :key="phase.id"
          :title="phase.name"
          :description="phase.type"
          orientation="horizontal"
          :to="`/e/${eventId}/live/${categoryId}/${phase.id}`"
        />
      </div>
    </UCard>
  </div>
</template>
