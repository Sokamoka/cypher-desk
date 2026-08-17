<script setup lang="ts">
const route = useRoute();
const eventId = computed(() => route.params.id as string);

const { data, pending, error, hasCategories } = usePublicEvent(eventId);
const eventData = computed(() => data.value?.event ?? null);
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <USkeleton class="h-32 w-full" />
  </div>

  <div v-else-if="error || !eventData" class="text-center py-24">
    <p class="text-muted">This event could not be found.</p>
  </div>

  <UCard v-else-if="hasCategories" variant="soft">
    <template #header>
      <h2 class="text-lg font-semibold">Registered participants</h2>
    </template>

    <div class="space-y-6">
      <div v-for="category in eventData.categories" :key="category.id">
        <h3 class="font-medium">
          {{ category.name }}
          <span class="text-muted font-normal"
            >({{ category.participants.length }})</span
          >
        </h3>

        <p
          v-if="category.participants.length === 0"
          class="text-muted mt-1"
        >
          No participants yet.
        </p>
        <ul v-else class="mt-1 flex gap-1">
          <li v-for="(name, index) in category.participants" :key="index">
            <UBadge variant="subtle" size="lg">{{ name }}</UBadge>
          </li>
        </ul>
      </div>
    </div>
  </UCard>
</template>
