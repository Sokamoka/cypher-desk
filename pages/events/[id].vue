<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink to="/events">
          <UButton
            icon="heroicons:arrow-left"
            variant="soft"
            color="gray"
          >
            Back to Events
          </UButton>
        </NuxtLink>
      </div>

      <!-- Event Details Loading -->
      <div v-if="pending" class="space-y-6">
        <USkeleton class="h-12 w-2/3" />
        <USkeleton class="h-32" />
        <USkeleton class="h-64" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">Failed to load event. Please try again later.</p>
      </div>

      <!-- Not Found -->
      <div v-else-if="!data?.event" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-yellow-700">Event not found.</p>
      </div>

      <!-- Event Content -->
      <template v-else>
        <!-- Event Header -->
        <div class="mb-8">
          <div class="mb-4 flex flex-wrap gap-2">
            <UBadge
              v-for="category in data.event.categories"
              :key="category.id"
              color="blue"
              variant="subtle"
            >
              {{ category.name }}
            </UBadge>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            {{ data.event.title }}
          </h1>
          <div class="flex flex-col sm:flex-row gap-4 text-gray-600">
            <div class="flex items-center gap-2">
              <Icon name="heroicons:calendar" class="w-5 h-5" />
              {{ formatDate(data.event.eventDate) }}
            </div>
            <div v-if="data.event.location" class="flex items-center gap-2">
              <Icon name="heroicons:map-pin" class="w-5 h-5" />
              {{ data.event.location }}
            </div>
            <div class="flex items-center gap-2">
              <Icon name="heroicons:users" class="w-5 h-5" />
              {{ data.event.registrationCount }} participants
            </div>
          </div>
        </div>

        <div class="grid gap-8 lg:grid-cols-3">
          <!-- Event Description & Participants -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Description -->
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold">About this event</h2>
              </template>
              <p class="text-gray-700 whitespace-pre-wrap">
                {{ data.event.description || 'No description provided.' }}
              </p>
            </UCard>

            <!-- Participants by Category -->
            <div v-if="Object.keys(data.event.participantsByCategory).length > 0">
              <h2 class="text-lg font-semibold mb-4">Registered Participants</h2>
              <div class="space-y-4">
                <UCard
                  v-for="(categoryGroup, categoryId) in data.event.participantsByCategory"
                  :key="categoryId"
                >
                  <template #header>
                    <div class="flex items-center justify-between">
                      <h3 class="font-semibold">
                        {{ categoryGroup.category.name }}
                      </h3>
                      <UBadge variant="subtle">
                        {{ categoryGroup.participants.length }} registered
                      </UBadge>
                    </div>
                  </template>

                  <div class="space-y-2">
                    <div
                      v-if="categoryGroup.participants.length === 0"
                      class="text-gray-500 text-sm"
                    >
                      No participants yet in this category
                    </div>
                    <div
                      v-for="participant in categoryGroup.participants"
                      :key="participant.id"
                      class="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <span class="font-medium text-gray-900">
                        {{ participant.name }}
                      </span>
                      <span class="text-xs text-gray-500">
                        {{ formatCreatedDate(participant.createdAt) }}
                      </span>
                    </div>
                  </div>
                </UCard>
              </div>
            </div>
          </div>

          <!-- Registration Form -->
          <div>
            <UCard class="sticky top-6">
              <template #header>
                <h2 class="text-lg font-semibold">Register for this event</h2>
              </template>

              <UForm
                :schema="CreateRegistrationSchema"
                :state="formState"
                @submit="onSubmit"
              >
                <div class="space-y-4">
                  <!-- Applicant Name -->
                  <UFormGroup label="Your Name" name="applicantName" required>
                    <UInput
                      v-model="formState.applicantName"
                      type="text"
                      placeholder="Enter your full name"
                    />
                  </UFormGroup>

                  <!-- Applicant Email -->
                  <UFormGroup label="Your Email" name="applicantEmail" required>
                    <UInput
                      v-model="formState.applicantEmail"
                      type="email"
                      placeholder="Enter your email address"
                    />
                  </UFormGroup>

                  <!-- Category Selection -->
                  <UFormGroup label="Select Category" name="categoryId" required>
                    <USelect
                      v-model.number="formState.categoryId"
                      :options="categoryOptions"
                      option-attribute="label"
                      value-attribute="value"
                      placeholder="Choose a category"
                    />
                  </UFormGroup>

                  <!-- Event ID (Hidden) -->
                  <input
                    v-model="formState.eventId"
                    type="hidden"
                  />

                  <!-- Loading & Error States -->
                  <div v-if="submitting" class="text-sm text-gray-600">
                    Submitting registration...
                  </div>
                  <UAlert
                    v-if="submitError"
                    icon="heroicons:exclamation-triangle"
                    color="red"
                    title="Registration Error"
                    :description="submitError"
                    class="mb-4"
                  />
                  <UAlert
                    v-if="submitSuccess"
                    icon="heroicons:check-circle"
                    color="green"
                    title="Success"
                    description="You have successfully registered for this event!"
                    class="mb-4"
                  />

                  <!-- Submit Button -->
                  <UButton
                    type="submit"
                    block
                    :loading="submitting"
                    color="blue"
                  >
                    <Icon name="heroicons:check" class="w-4 h-4 mr-2" />
                    Register Now
                  </UButton>
                </div>
              </UForm>
            </UCard>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v } from 'valibot';
import { CreateRegistrationSchema, type CreateRegistration } from '~/utils/schemas';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const eventId = route.params.id as string;

// Fetch event details
const { data, pending, error, refresh } = await useFetch(`/api/events/${eventId}`);

// Form state
const formState = reactive<CreateRegistration>({
  eventId: eventId,
  categoryId: 0,
  applicantName: '',
  applicantEmail: '',
});

// Category options
const categoryOptions = computed(() => {
  if (!data.value?.event?.categories) return [];
  return data.value.event.categories.map((cat: any) => ({
    label: cat.name,
    value: cat.id,
  }));
});

// Submission state
const submitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Helper to format event date
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper to format registration date
const formatCreatedDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
};

// Form submission handler
const onSubmit = async () => {
  try {
    submitting.value = true;
    submitError.value = null;
    submitSuccess.value = false;

    // Validate state
    const validatedData = v.parse(CreateRegistrationSchema, formState);

    // Submit registration
    const response = await $fetch('/api/registrations', {
      method: 'POST',
      body: validatedData,
    });

    submitSuccess.value = true;

    // Reset form
    formState.applicantName = '';
    formState.applicantEmail = '';
    formState.categoryId = 0;

    // Refresh event data to show new registration
    setTimeout(() => {
      refresh();
    }, 2000);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'data' in err) {
      const errorData = err.data as any;
      submitError.value = errorData?.message || 'Registration failed';
    } else {
      submitError.value = 'An error occurred during registration. Please try again.';
    }
  } finally {
    submitting.value = false;
  }
};
</script>
