<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Upcoming Events</h1>
        <p class="mt-2 text-gray-600">
          Browse and register for upcoming events
        </p>
      </div>

      <div v-if="pending" class="text-center py-12">
        <USkeleton class="h-32 w-full mb-4" />
        <USkeleton class="h-32 w-full mb-4" />
        <USkeleton class="h-32 w-full" />
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">
          Failed to load events. Please try again later.
        </p>
      </div>

      <div v-else class="grid gap-6">
        <div v-if="!data?.events || data.events.length === 0" class="text-center py-12">
          <p class="text-gray-600">No events available at this time.</p>
        </div>

        <NuxtLink
          v-for="event in data?.events"
          :key="event.id"
          :to="`/events/${event.id}`"
          class="block"
        >
          <UCard class="hover:shadow-lg transition-shadow duration-200">
            <template #header>
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">
                    {{ event.title }}
                  </h2>
                </div>
                <div class="flex gap-2 flex-wrap justify-end">
                  <UBadge
                    v-for="category in event.categories"
                    :key="category.id"
                    color="blue"
                    variant="subtle"
                  >
                    {{ category.name }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="space-y-3">
              <p class="text-gray-600 line-clamp-2">
                {{ event.description || 'No description' }}
              </p>

              <div class="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:calendar" class="w-4 h-4" />
                  {{ formatDate(event.eventDate) }}
                </div>
                <div v-if="event.location" class="flex items-center gap-2">
                  <Icon name="heroicons:map-pin" class="w-4 h-4" />
                  {{ event.location }}
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">
                  Click to view details and register
                </span>
                <UButton
                  icon="heroicons:arrow-right"
                  trailing
                  color="blue"
                  variant="soft"
                >
                  View Event
                </UButton>
              </div>
            </template>
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const { data, pending, error } = await useFetch('/api/events');

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>
