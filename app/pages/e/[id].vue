<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import {
  CreateEventRegistrationSchema,
  type CreateEventRegistration,
} from "~~/utils/schemas";

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
const toast = useToast();

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
const submitting = ref(false);

const formState = reactive({
  participantName: "",
  participantEmail: "",
  categoryIds: [] as string[],
});

// Require at least one category when the event has any, in addition to the
// base registration schema.
const registrationSchema = computed(() =>
  hasCategories.value
    ? v.pipe(
        CreateEventRegistrationSchema,
        v.forward(
          v.partialCheck(
            [["categoryIds"]],
            (input) => input.categoryIds.length > 0,
            "Please select at least one category",
          ),
          ["categoryIds"],
        ),
      )
    : CreateEventRegistrationSchema,
);

async function onRegister(event: FormSubmitEvent<CreateEventRegistration>) {
  submitting.value = true;

  try {
    await $fetch(`/api/public/events/${route.params.id}/register`, {
      method: "POST",
      body: event.data,
    });

    registered.value = true;
    toast.add({ title: "Registration submitted", color: "success" });
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Registration failed",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
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

            <UForm
              v-else
              :schema="registrationSchema"
              :state="formState"
              class="space-y-4"
              @submit="onRegister"
            >
              <UFormField label="Name" name="participantName" required>
                <UInput
                  v-model="formState.participantName"
                  placeholder="Your name"
                />
              </UFormField>

              <UFormField label="Email" name="participantEmail" required>
                <UInput
                  v-model="formState.participantEmail"
                  type="email"
                  placeholder="you@example.com"
                />
              </UFormField>

              <UFormField
                v-if="hasCategories"
                label="Categories"
                name="categoryIds"
                required
              >
                <UCheckboxGroup
                  v-model="formState.categoryIds"
                  :items="
                    eventData.categories.map((c) => ({
                      label: c.name,
                      value: c.id,
                    }))
                  "
                />
              </UFormField>

              <UButton type="submit" block :loading="submitting">
                Register
              </UButton>
            </UForm>
          </UCard>
        </template>
      </UTabs>
    </div>
  </UContainer>
</template>
