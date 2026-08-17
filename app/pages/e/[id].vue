<script setup lang="ts">
import type { AccordionItem } from "@nuxt/ui";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const eventId = computed(() => route.params.id as string);

const { data, pending, error } = usePublicEvent(eventId);

const eventData = computed(() => data.value?.event ?? null);

useSeoMeta({
  title: () => eventData.value?.title ?? "Event",
  description: () => eventData.value?.description ?? "Public event page",
});

const accordionValue = ref("1");

const accordionItems = computed((): AccordionItem[] => [
  {
    label: "Description",
    content: eventData.value?.description ?? "",
  },
  {
    label: "Judges",
    slot: "judges" as const,
  },
]);

const tabItems = computed(() => [
  {
    label: "Live",
    icon: "i-lucide-user",
    to: `/e/${eventId.value}/live`,
  },
  {
    label: "Participants",
    icon: "i-lucide-user",
    to: `/e/${eventId.value}/participants`,
  },
  {
    label: "Registration",
    icon: "i-lucide-lock",
    to: `/e/${eventId.value}/registration`,
  },
]);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
</script>

<template>
  <UContainer class="py-16 max-w-2xl">
    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-10 w-2/3" />
      <USkeleton class="h-32 w-full" />
    </div>

    <div v-else-if="error || !eventData" class="text-center py-24">
      <p class="text-muted">This event could not be found.</p>
    </div>

    <div v-else class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">{{ eventData.title }}</h1>
        <div class="flex items-center gap-3 mt-2">
          <UUser
            :name="formatDateRange(eventData.startDate, eventData.endDate)"
          >
            <template #avatar><UIcon name="i-lucide-calendar" /></template>
          </UUser>
          <UUser :name="eventData.location">
            <template #avatar><UIcon name="i-lucide-map-pin" /></template>
          </UUser>
        </div>
        <UCard class="mt-5" :ui="{ body: 'pt-3 sm:pt-3' }">
          <UAccordion v-model="accordionValue" :items="accordionItems">
            <template #judges>
              <div v-if="eventData.judges?.length" class="flex flex-wrap gap-2">
                <UBadge
                  v-for="judge in eventData.judges"
                  :key="judge.name"
                  variant="subtle"
                  color="neutral"
                  size="lg"
                >
                  {{ judge.name }}
                </UBadge>
              </div>
            </template>
          </UAccordion>
        </UCard>
      </div>

      <div>
        <UNavigationMenu :items="tabItems" variant="link" highlight />

        <NuxtPage />
      </div>
    </div>
  </UContainer>
</template>
