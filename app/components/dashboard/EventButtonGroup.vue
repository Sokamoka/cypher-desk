<script setup lang="ts">
defineProps<{
  eventId: string;
}>();

const route = useRoute();
</script>

<template>
  <UFieldGroup>
    <UButton
      color="neutral"
      icon="i-lucide-info"
      :variant="route.name === 'info' ? 'solid' : 'subtle'"
      label="Info"
      :to="`/dashboard/event/${eventId}`"
    />
    <UButton
      label="Categories"
      icon="i-lucide-layers"
      color="neutral"
      :variant="route.name === 'categories' ? 'solid' : 'subtle'"
      :to="`/dashboard/event/${eventId}/categories`"
    />
    <UButton
      label="Participants"
      icon="i-lucide-users"
      color="neutral"
      :variant="route.name === 'participants' ? 'solid' : 'subtle'"
      :to="`/dashboard/event/${eventId}/participants`"
    />
  </UFieldGroup>
</template>
