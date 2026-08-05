<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Back Button -->
      <div class="mb-6">
        <NuxtLink to="/admin">
          <UButton
            icon="heroicons:arrow-left"
            variant="soft"
            color="gray"
          >
            Back to Admin
          </UButton>
        </NuxtLink>
      </div>

      <!-- Page Title -->
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Create New Event</h1>

      <!-- Form -->
      <UCard>
        <UForm
          :schema="CreateEventSchema"
          :state="formState"
          @submit="onSubmit"
        >
          <div class="space-y-6">
            <!-- Title -->
            <UFormGroup label="Event Title" name="title" required>
              <UInput
                v-model="formState.title"
                placeholder="Enter event title"
              />
            </UFormGroup>

            <!-- Description -->
            <UFormGroup label="Description" name="description">
              <UTextarea
                v-model="formState.description"
                placeholder="Enter event description"
                rows="5"
              />
            </UFormGroup>

            <!-- Date -->
            <UFormGroup label="Event Date & Time" name="eventDate" required>
              <UInput
                v-model="formState.eventDate"
                type="datetime-local"
              />
            </UFormGroup>

            <!-- Location -->
            <UFormGroup label="Location" name="location">
              <UInput
                v-model="formState.location"
                placeholder="Enter event location"
              />
            </UFormGroup>

            <!-- Dynamic Categories -->
            <div class="border-t pt-6">
              <div class="flex items-center justify-between mb-4">
                <label class="text-sm font-semibold text-gray-900">
                  Categories <span class="text-red-500">*</span>
                </label>
                <UButton
                  type="button"
                  icon="heroicons:plus"
                  size="sm"
                  color="green"
                  variant="soft"
                  @click="addCategory"
                >
                  Add Category
                </UButton>
              </div>

              <div class="space-y-3">
                <div
                  v-if="categories.length === 0"
                  class="text-sm text-gray-500 italic"
                >
                  No categories added yet. Click "Add Category" to get started.
                </div>

                <div
                  v-for="(category, index) in categories"
                  :key="index"
                  class="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                >
                  <UFormGroup :label="`Category ${index + 1} Name`" required>
                    <UInput
                      v-model="category.name"
                      placeholder="e.g., Girl, 1x1 Open"
                      @input="updateCategoryName(index, $event.target.value)"
                    />
                  </UFormGroup>

                  <UFormGroup :label="`Category ${index + 1} Max Capacity`">
                    <UInput
                      v-model.number="category.maxCapacity"
                      type="number"
                      placeholder="Leave empty for unlimited"
                      @input="updateCategoryCapacity(index, $event.target.value)"
                    />
                  </UFormGroup>

                  <div class="flex justify-end">
                    <UButton
                      type="button"
                      icon="heroicons:trash"
                      size="sm"
                      color="red"
                      variant="ghost"
                      @click="removeCategory(index)"
                    >
                      Remove
                    </UButton>
                  </div>
                </div>
              </div>

              <div v-if="categories.length > 0" class="mt-4 text-sm text-gray-600">
                {{ categories.length }} categor{{ categories.length !== 1 ? 'ies' : 'y' }} added
              </div>
            </div>

            <!-- Loading & Error States -->
            <div v-if="submitting" class="text-sm text-gray-600 text-center">
              Creating event...
            </div>
            <UAlert
              v-if="submitError"
              icon="heroicons:exclamation-triangle"
              color="red"
              title="Error"
              :description="submitError"
            />
            <UAlert
              v-if="submitSuccess"
              icon="heroicons:check-circle"
              color="green"
              title="Success"
              description="Event created successfully! Redirecting..."
            />

            <!-- Submit Button -->
            <div class="flex gap-3 pt-4 border-t">
              <UButton
                type="submit"
                :loading="submitting"
                color="blue"
                class="flex-1"
              >
                <Icon name="heroicons:check" class="w-4 h-4 mr-2" />
                Create Event
              </UButton>
              <NuxtLink to="/admin">
                <UButton
                  type="button"
                  color="gray"
                  variant="soft"
                >
                  Cancel
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v } from 'valibot';
import { CreateEventSchema, type CategoryInput } from '~/utils/schemas';

definePageMeta({
  layout: 'default',
});

// Form state
const formState = reactive({
  title: '',
  description: '',
  eventDate: '',
  location: '',
  categories: [] as CategoryInput[],
});

const categories = ref<CategoryInput[]>([]);
const submitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Add a category
const addCategory = () => {
  categories.value.push({ name: '', maxCapacity: undefined });
};

// Remove a category
const removeCategory = (index: number) => {
  categories.value.splice(index, 1);
};

// Update category name
const updateCategoryName = (index: number, name: string) => {
  categories.value[index].name = name;
};

// Update category capacity
const updateCategoryCapacity = (index: number, capacity: string) => {
  const num = capacity ? Number(capacity) : undefined;
  categories.value[index].maxCapacity = num;
};

// Form submission
const onSubmit = async () => {
  try {
    submitting.value = true;
    submitError.value = null;
    submitSuccess.value = false;

    // Validate categories
    if (categories.value.length === 0) {
      submitError.value = 'Please add at least one category';
      submitting.value = false;
      return;
    }

    // Validate category names
    const hasEmptyNames = categories.value.some((cat) => !cat.name || cat.name.trim().length === 0);
    if (hasEmptyNames) {
      submitError.value = 'All categories must have a name';
      submitting.value = false;
      return;
    }

    // Prepare form data
    const eventData = {
      title: formState.title,
      description: formState.description || undefined,
      eventDate: new Date(formState.eventDate).toISOString(),
      location: formState.location || undefined,
      categories: categories.value.map((cat) => ({
        name: cat.name.trim(),
        maxCapacity: cat.maxCapacity,
      })),
    };

    // Validate with schema
    const validatedData = v.parse(CreateEventSchema, eventData);

    // Submit to API
    await $fetch('/api/events', {
      method: 'POST',
      body: validatedData,
    });

    submitSuccess.value = true;

    // Redirect after success
    setTimeout(() => {
      navigateTo('/admin');
    }, 1500);
  } catch (err) {
    if (err instanceof v.ValiError) {
      submitError.value = 'Validation failed: Please check your input';
    } else if (typeof err === 'object' && err !== null && 'data' in err) {
      const errorData = err.data as any;
      submitError.value = errorData?.message || 'Failed to create event';
    } else {
      submitError.value = 'An error occurred. Please try again.';
    }
  } finally {
    submitting.value = false;
  }
};
</script>
