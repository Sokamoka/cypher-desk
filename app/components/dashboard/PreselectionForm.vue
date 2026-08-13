<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { CreatePreselectionPhase } from "~~/utils/schemas";
import { CreatePreselectionPhaseSchema } from "~~/utils/schemas";

const props = defineProps<{
  id?: string;
  eventId: string;
  categoryId: string;
}>();

const emit = defineEmits<{
  submitted: [];
}>();

const toast = useToast();
const submitting = ref(false);

const state = reactive<CreatePreselectionPhase>({
  categoryId: props.categoryId,
  name: "",
  numberOfCypher: 1,
  groupSize: 1,
});

watchEffect(() => {
  state.categoryId = props.categoryId;
});

async function onSubmit(event: FormSubmitEvent<CreatePreselectionPhase>) {
  submitting.value = true;

  try {
    await $fetch(`/api/events/${props.eventId}/categories/phases/preselection`, {
      method: "POST",
      body: event.data,
    });

    toast.add({ title: "Preselection created", color: "success" });
    emit("submitted");
  } catch (error: any) {
    toast.add({
      title: "Failed to create preselection",
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
    :schema="CreatePreselectionPhaseSchema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField label="Phase name" name="name" required>
      <UInput v-model="state.name" placeholder="Enter name" />
    </UFormField>

    <UFormField label="Number of Cypher" name="numberOfCypher" required>
      <UInputNumber v-model="state.numberOfCypher" />
    </UFormField>

    <UFormField label="Group size" name="groupSize" required>
      <UInputNumber v-model="state.groupSize" />
    </UFormField>

    <UButton type="submit" :loading="submitting" class="hidden">Submit</UButton>
  </UForm>
</template>
