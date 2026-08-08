<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import {
  CreateEventRegistrationSchema,
  type CreateEventRegistration,
} from "~~/utils/schemas";

definePageMeta({
  layout: "page",
});

const route = useRoute();
const toast = useToast();

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  slug: string;
}

const {
  data,
  pending,
  error,
} = await useFetch<{ success: boolean; event: PublicEvent }>(
  () => `/api/public/events/${route.params.id}`,
);

const eventData = computed(() => data.value?.event ?? null);

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
});

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

    <div
      v-else-if="error || !eventData"
      class="text-center py-24"
    >
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
          :schema="CreateEventRegistrationSchema"
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

          <UButton type="submit" block :loading="submitting">
            Register
          </UButton>
        </UForm>
      </UCard>
    </div>
  </UContainer>
</template>
