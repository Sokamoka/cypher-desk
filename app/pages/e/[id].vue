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

const route = useRoute();
const toast = useToast();

interface EventCategory {
  id: string;
  name: string;
}

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  slug: string;
  categories: EventCategory[];
}

const { data, pending, error } = await useFetch<{
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const registered = ref(false);
const submitting = ref(false);

const formState = reactive({
  attendeeName: "",
  attendeeEmail: "",
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
        <p v-if="eventData.description" class="mt-4">
          {{ eventData.description }}
        </p>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Register for this event</h2>
        </template>

        <div v-if="registered" class="text-center py-8">
          <p class="text-highlighted font-medium">
            Thanks! Your registration has been submitted.
          </p>
        </div>

        <UForm
          v-else
          :schema="registrationSchema"
          :state="formState"
          class="space-y-4"
          @submit="onRegister"
        >
          <UFormField label="Name" name="attendeeName" required>
            <UInput v-model="formState.attendeeName" placeholder="Your name" />
          </UFormField>

          <UFormField label="Email" name="attendeeEmail" required>
            <UInput
              v-model="formState.attendeeEmail"
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
                eventData.categories.map((c) => ({ label: c.name, value: c.id }))
              "
            />
          </UFormField>

          <UButton type="submit" block :loading="submitting">
            Register
          </UButton>
        </UForm>
      </UCard>
    </div>
  </UContainer>
</template>
