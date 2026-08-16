<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const items = [
  {
    label: "Live",
    icon: "i-lucide-user",
    value: "live",
    slot: "live",
    disabled: true,
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
  date: string;
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
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
        <p class="mt-2 text-muted">{{ formatDate(eventData.date) }}</p>
        <UCollapsible v-if="eventData.description">
          <UButton
            class="group"
            label="Description"
            variant="link"
            trailing-icon="i-lucide-chevron-down"
            :ui="{
              base: 'px-0',
              trailingIcon:
                'group-data-[state=open]:rotate-180 transition-transform duration-200',
            }"
          />

          <template #content>
            <p>
              {{ eventData.description }}
            </p>
          </template>
        </UCollapsible>
      </div>

      <UTabs v-model="active" :items="items" variant="link">
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
