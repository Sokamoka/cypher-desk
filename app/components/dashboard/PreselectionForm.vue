<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { CreatePreselectionPhase } from "~~/utils/schemas";
import { createPreselectionPhaseSchema } from "~~/utils/schemas";
import { shuffleParticipants } from "~~/utils/cypher";

interface PreselectionJudge {
  name: string;
}

interface PreselectionParticipant {
  id: number;
  participantName: string;
}

const props = defineProps<{
  id?: string;
  eventId: string;
  categoryId: string;
  judges: PreselectionJudge[];
  participants: PreselectionParticipant[];
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
  cyphers: [{ judges: [] }],
});

// Validation caps each cypher's judge selection at the event's actual judge
// count (min 1, max = total judges assigned to the event).
const schema = computed(() =>
  createPreselectionPhaseSchema(props.judges.length),
);

const judgeNames = computed(() => props.judges.map((judge) => judge.name));

watchEffect(() => {
  state.categoryId = props.categoryId;
});

// Keep `state.cyphers` in sync with `numberOfCypher`: grow the array with
// empty judge selections, or shrink it, while preserving existing
// selections for cyphers that remain.
watch(
  () => state.numberOfCypher,
  (numberOfCypher) => {
    const count = Math.max(1, Math.trunc(numberOfCypher || 1));

    if (state.cyphers.length < count) {
      while (state.cyphers.length < count) {
        state.cyphers.push({ judges: [] });
      }
    } else if (state.cyphers.length > count) {
      state.cyphers.splice(count);
    }
  },
  { immediate: true },
);

// Client-side preview only — the authoritative random shuffle happens
// server-side on submit so the grouping can't be predicted/gamed
// beforehand. Regenerated whenever the number of cyphers or the
// participant list changes, or when the organizer clicks "Shuffle again".
const participantPreview = ref<PreselectionParticipant[][]>([]);

function regeneratePreview() {
  participantPreview.value = shuffleParticipants(
    props.participants,
    Math.max(1, Math.trunc(state.numberOfCypher || 1)),
  );
}

watch(
  [() => state.numberOfCypher, () => props.participants],
  regeneratePreview,
  { immediate: true },
);

async function onSubmit(event: FormSubmitEvent<CreatePreselectionPhase>) {
  submitting.value = true;

  try {
    await $fetch(
      `/api/events/${props.eventId}/categories/phases/preselection`,
      {
        method: "POST",
        body: event.data,
      },
    );

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
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField label="Phase name" name="name" required>
      <UInput v-model="state.name" placeholder="Enter name" class="w-full" />
    </UFormField>

    <UFormField label="Number of Cypher" name="numberOfCypher" required>
      <UInputNumber v-model="state.numberOfCypher" :min="1" />
    </UFormField>

    <UFormField label="Group size" name="groupSize" required>
      <UInputNumber v-model="state.groupSize" :min="1" />
    </UFormField>

    <div
      v-for="(cypher, index) in state.cyphers"
      :key="index"
      class="space-y-2"
    >
      <UFormField
        :label="`Judges for Cypher ${index + 1}`"
        :name="`cyphers.${index}.judges`"
        required
      >
        <USelectMenu
          v-model="cypher.judges"
          multiple
          :items="judgeNames"
          placeholder="Select judge(s)"
          class="w-full"
        />
      </UFormField>

      <div
        v-if="participantPreview[index]?.length"
        class="rounded-md border border-default p-2"
      >
        <p class="text-xs font-medium text-muted mb-1">
          Cypher {{ index + 1 }} participants ({{
            participantPreview[index]?.length
          }})
        </p>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="participant in participantPreview[index]"
            :key="participant.id"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ participant.participantName }}
          </UBadge>
        </div>
      </div>
    </div>

    <UButton
      v-if="state.numberOfCypher > 1"
      icon="i-lucide-shuffle"
      color="neutral"
      variant="soft"
      size="sm"
      @click="regeneratePreview"
    >
      Shuffle participants again
    </UButton>

    <UButton type="submit" :loading="submitting" class="hidden">Submit</UButton>
  </UForm>
</template>
