<script setup lang="ts">
import type { AccordionItem, TableColumn } from "@nuxt/ui";

definePageMeta({
  layout: "default",
});

const items = [
  {
    label: "Live",
    icon: "i-lucide-user",
    value: "live",
    slot: "live",
  },
  {
    label: "Participants",
    value: "participants",
    icon: "i-lucide-user",
    slot: "participants",
  },
  {
    label: "Registration",
    icon: "i-lucide-lock",
    value: "registration",
    slot: "registration",
  },
];

const accordionValue = ref("1");

const route = useRoute();
const router = useRouter();

interface EventCategory {
  id: string;
  name: string;
  participants: string[];
}

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
  slug: string;
  categories: EventCategory[];
}

const { data, pending, error, refresh } = await useFetch<{
  success: boolean;
  event: PublicEvent;
}>(() => `/api/public/events/${route.params.id}`);

const eventData = computed(() => data.value?.event ?? null);
const hasCategories = computed(
  () => (eventData.value?.categories.length ?? 0) > 0,
);

const categoryColumns: TableColumn<EventCategory>[] = [
  { accessorKey: "name", header: "Category" },
  { id: "participantCount", header: "Participants" },
  // { id: "participants", header: "Registered participants" },
];

useSeoMeta({
  title: () => eventData.value?.title ?? "Event",
  description: () => eventData.value?.description ?? "Public event page",
});

const active = computed({
  get() {
    return (route.query.tab as string) || "registration";
  },
  set(tab) {
    // Hash is specified here to prevent the page from scrolling to the top
    router.push({
      path: route.path,
      query: { tab },
      // hash: '#with-route-query'
    });
  },
});

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

const registered = ref(false);

async function onRegistered() {
  registered.value = true;
  await refresh();
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
                >
                  {{ judge.name }}
                </UBadge>
              </div>
            </template>
          </UAccordion>
        </UCard>
      </div>

      <UTabs v-model="active" :items="items" variant="link">
        <template #live>
          <div v-if="hasCategories" class="overflow-x-auto">
            <UTable :data="eventData.categories" :columns="categoryColumns">
              <template #participantCount-cell="{ row }">
                {{ row.original.participants.length }}
              </template>

              <!-- <template #participants-cell="{ row }">
                <div
                  v-if="row.original.participants.length"
                  class="flex flex-wrap gap-1"
                >
                  <UBadge
                    v-for="name in row.original.participants"
                    :key="name"
                    variant="subtle"
                    color="neutral"
                  >
                    {{ name }}
                  </UBadge>
                </div>
                <span v-else class="text-muted">No participants yet.</span>
              </template> -->
            </UTable>
          </div>
          <p v-else class="text-muted">No categories available.</p>
        </template>

        <template #participants>
          <UCard v-if="hasCategories" variant="soft">
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
                  <li
                    v-for="(name, index) in category.participants"
                    :key="index"
                  >
                    <UBadge variant="subtle" size="lg">{{ name }}</UBadge>
                  </li>
                </ul>
              </div>
            </div>
          </UCard>
        </template>

        <template #registration>
          <UCard variant="soft">
            <template #header>
              <h2 class="text-lg font-semibold">Register for this event</h2>
            </template>

            <div v-if="registered" class="text-center py-8">
              <p class="text-highlighted font-medium">
                Thanks! Your registration has been submitted.
              </p>
              <div class="space-x-3">
                <UButton label="Participants" color="neutral" />
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
      </UTabs>
    </div>
  </UContainer>
</template>
