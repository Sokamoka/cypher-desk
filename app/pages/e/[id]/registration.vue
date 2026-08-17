<script setup lang="ts">
const route = useRoute();
const eventId = computed(() => route.params.id as string);

const { data, pending, error, refresh } = usePublicEvent(eventId);
const eventData = computed(() => data.value?.event ?? null);

const registered = ref(false);

async function onRegistered() {
  registered.value = true;
  await refresh();
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <USkeleton class="h-32 w-full" />
  </div>

  <div v-else-if="error || !eventData" class="text-center py-24">
    <p class="text-muted">This event could not be found.</p>
  </div>

  <UCard v-else variant="soft">
    <template #header>
      <h2 class="text-lg font-semibold">Register for this event</h2>
    </template>

    <div v-if="registered" class="text-center py-8">
      <p class="text-highlighted font-medium">
        Thanks! Your registration has been submitted.
      </p>
      <div class="space-x-3">
        <UButton
          label="Participants"
          color="neutral"
          :to="`/e/${eventId}/participants`"
        />
        <UButton label="New Registration" @click="registered = false" />
      </div>
    </div>

    <EventRegistrationForm
      v-else
      :event-id="eventData.id"
      :categories="eventData.categories"
      mode="public"
      @submitted="onRegistered"
    />
  </UCard>
</template>
