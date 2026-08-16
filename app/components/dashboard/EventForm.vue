<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

interface EventFormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
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

const judgeTags = computed({
  get: () => props.state.judges.map((judge) => judge.name),
  set: (value: string[]) => {
    props.state.judges = value
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ name }));
  },
});
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

    <UFormField label="Location" name="location" required>
      <UInput
        v-model="props.state.location"
        placeholder="e.g. Budapest"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Start Date" name="startDate" required>
        <UInput
          v-model="props.state.startDate"
          type="date"
          class="w-full"
        />
      </UFormField>

      <UFormField label="End Date" name="endDate" required>
        <UInput
          v-model="props.state.endDate"
          type="date"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Judges"
      name="judges"
      help="Add judge name and press enter"
    >
      <UInputTags
        v-model="judgeTags"
        placeholder="e.g. Alex"
        class="w-full"
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
