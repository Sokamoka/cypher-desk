<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

interface EventFormState {
  title: string;
  description: string;
  date: string;
  categories: string[];
}

const props = withDefaults(
  defineProps<{
    schema: unknown;
    state: EventFormState;
    submitLabel?: string;
    submitLoading?: boolean;
    cancelLabel?: string;
  }>(),
  {
    submitLabel: "Save Changes",
    submitLoading: false,
    cancelLabel: "Cancel",
  },
);

const emit = defineEmits<{
  submit: [event: FormSubmitEvent<EventFormState>];
  cancel: [];
}>();
</script>

<template>
  <UForm
    :schema="props.schema"
    :state="props.state"
    class="space-y-4"
    @submit="emit('submit', $event)"
  >
    <UFormField label="Title" name="title" required>
      <UInput
        v-model="props.state.title"
        placeholder="Event title"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea
        v-model="props.state.description"
        placeholder="Event description"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Date" name="date" required>
      <UInput
        v-model="props.state.date"
        type="datetime-local"
        placeholder="Event date"
      />
    </UFormField>

    <UFormField
      label="Categories"
      name="categories"
      hint="Optional"
      help="Add category name and press enter"
    >
      <UInputTags
        v-model="props.state.categories"
        placeholder="e.g. Girls, Boys"
        class="w-full"
      />
    </UFormField>

    <div class="flex gap-3 justify-end pt-2">
      <UButton variant="soft" color="neutral" type="button" @click="emit('cancel')">
        {{ props.cancelLabel }}
      </UButton>
      <UButton type="submit" :loading="props.submitLoading">
        {{ props.submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
