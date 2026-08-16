<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import {
  CreateEventRegistrationSchema,
  type CreateEventRegistration,
} from "~~/utils/schemas";

interface EventCategoryOption {
  id: string;
  name: string;
}

interface RegistrationInput {
  id: number;
  participantName: string;
  participantEmail: string;
  categoryIds: string[];
}

const props = withDefaults(
  defineProps<{
    id?: string;
    eventId: string;
    categories: EventCategoryOption[];
    // Presence of this prop switches the component into edit mode: the form
    // is prefilled and submits to the update endpoint instead of create.
    registration?: RegistrationInput | null;
    // "public" submits to the unauthenticated registration endpoint,
    // "dashboard" submits to the owner-only endpoints under /api/events.
    mode?: "public" | "dashboard";
    showSubmitButton?: boolean;
    submitLabel?: string;
  }>(),
  {
    registration: null,
    mode: "public",
    showSubmitButton: true,
    submitLabel: "Register",
  },
);

const emit = defineEmits<{
  submitted: [];
}>();

const submitting = defineModel<boolean>("submitting", { default: false });

const toast = useToast();

const hasCategories = computed(() => props.categories.length > 0);

const formState = reactive({
  participantName: props.registration?.participantName ?? "",
  participantEmail: props.registration?.participantEmail ?? "",
  categoryIds: [...(props.registration?.categoryIds ?? [])] as string[],
});

// Keep the form in sync when the parent swaps which registration is being
// edited (e.g. reusing the same modal instance for different rows).
watch(
  () => props.registration,
  (registration) => {
    formState.participantName = registration?.participantName ?? "";
    formState.participantEmail = registration?.participantEmail ?? "";
    formState.categoryIds = [...(registration?.categoryIds ?? [])];
  },
);

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

async function onSubmit(event: FormSubmitEvent<CreateEventRegistration>) {
  submitting.value = true;

  try {
    if (props.registration) {
      await $fetch(
        `/api/events/${props.eventId}/registrations/${props.registration.id}`,
        {
          method: "PUT",
          body: event.data,
        },
      );
      toast.add({ title: "Participant updated", color: "success" });
    } else {
      const endpoint =
        props.mode === "dashboard"
          ? `/api/events/${props.eventId}/registrations`
          : `/api/public/events/${props.eventId}/register`;

      await $fetch(endpoint, {
        method: "POST",
        body: event.data,
      });
      toast.add({ title: "Registration submitted", color: "success" });
    }

    emit("submitted");
  } catch (error: any) {
    toast.add({
      title: props.registration
        ? "Failed to update participant"
        : "Registration failed",
      description: error?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UForm
    :id="id"
    :schema="registrationSchema"
    :state="formState"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField label="Name" name="participantName" required>
      <UInput
        v-model="formState.participantName"
        placeholder="Your name"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Email" name="participantEmail" required>
      <UInput
        v-model="formState.participantEmail"
        type="email"
        placeholder="you@example.com"
        size="lg"
        class="w-full"
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
        size="lg"
        :items="
          categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))
        "
      />
    </UFormField>

    <UButton
      v-if="showSubmitButton"
      type="submit"
      block
      :loading="submitting"
    >
      {{ submitLabel }}
    </UButton>
  </UForm>
</template>
