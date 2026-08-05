<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p class="mt-2 text-gray-600">Manage events and registrations</p>
        </div>
        <div class="flex gap-3">
          <NuxtLink to="/admin/events/create">
            <UButton
              icon="heroicons:plus"
              color="blue"
            >
              Create Event
            </UButton>
          </NuxtLink>
          <NuxtLink to="/">
            <UButton
              icon="heroicons:arrow-left"
              variant="soft"
              color="gray"
            >
              Back to Events
            </UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="space-y-4">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-64 w-full" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">Failed to load registrations. Please try again later.</p>
      </div>

      <!-- Registrations Table -->
      <UCard v-else>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">All Registrations</h2>
            <UBadge color="blue" variant="soft">
              {{ registrationsData.length }} registrations
            </UBadge>
          </div>
        </template>

        <div v-if="registrationsData.length === 0" class="text-center py-12">
          <p class="text-gray-600">No registrations yet.</p>
        </div>

        <UTable
          v-else
          :rows="registrationsData"
          :columns="columns"
          :loading="pending"
        >
          <template #eventId-data="{ row }">
            <span class="font-medium text-gray-900">{{ row.eventId }}</span>
          </template>

          <template #applicantName-data="{ row }">
            <span class="font-medium text-gray-900">{{ row.applicantName }}</span>
          </template>

          <template #applicantEmail-data="{ row }">
            <span class="text-sm text-gray-600">{{ row.applicantEmail }}</span>
          </template>

          <template #categoryId-data="{ row }">
            <UBadge color="blue" variant="subtle">
              Category #{{ row.categoryId }}
            </UBadge>
          </template>

          <template #createdAt-data="{ row }">
            <span class="text-sm text-gray-600">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <div class="flex items-center gap-2">
              <UButton
                icon="heroicons:pencil"
                size="xs"
                color="blue"
                variant="ghost"
                @click="openEditModal(row)"
              />
              <UButton
                icon="heroicons:trash"
                size="xs"
                color="red"
                variant="ghost"
                @click="openDeleteConfirm(row)"
              />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Edit Modal -->
      <UModal v-model="isEditModalOpen" title="Edit Registration">
        <UCard
          :ui="{
            base: '',
            ring: '',
            divide: 'divide-y divide-gray-100 dark:divide-gray-800',
            body: { base: 'grow' },
          }"
        >
          <template #header>
            <h2 class="text-lg font-semibold">Edit Registration</h2>
          </template>

          <div v-if="selectedRegistration" class="space-y-4">
            <UFormGroup label="Event ID" required>
              <div class="text-gray-700 font-medium">
                {{ selectedRegistration.eventId }}
              </div>
            </UFormGroup>

            <UFormGroup label="Applicant Name" required>
              <UInput
                v-model="editFormState.applicantName"
                placeholder="Enter applicant name"
              />
            </UFormGroup>

            <UFormGroup label="Category ID" required>
              <UInput
                v-model.number="editFormState.categoryId"
                type="number"
                placeholder="Enter category ID"
              />
            </UFormGroup>

            <UFormGroup label="Email" disabled>
              <div class="text-gray-600 text-sm">
                {{ selectedRegistration.applicantEmail }}
              </div>
            </UFormGroup>
          </div>

          <template #footer>
            <div class="flex gap-3 justify-end">
              <UButton
                variant="soft"
                color="gray"
                @click="isEditModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="editSubmitting"
                @click="submitEdit"
              >
                Save Changes
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <!-- Delete Confirmation Dialog -->
      <UModal v-model="isDeleteConfirmOpen">
        <UCard
          :ui="{
            base: '',
            ring: '',
            divide: 'divide-y divide-gray-100 dark:divide-gray-800',
            body: { base: 'grow' },
          }"
        >
          <template #header>
            <h2 class="text-lg font-semibold">Delete Registration</h2>
          </template>

          <div class="space-y-4">
            <p class="text-gray-700">
              Are you sure you want to delete this registration?
            </p>
            <div v-if="selectedRegistration" class="bg-gray-50 p-3 rounded">
              <p class="text-sm"><strong>Name:</strong> {{ selectedRegistration.applicantName }}</p>
              <p class="text-sm"><strong>Email:</strong> {{ selectedRegistration.applicantEmail }}</p>
            </div>
            <p class="text-sm text-red-600">
              This action cannot be undone.
            </p>
          </div>

          <template #footer>
            <div class="flex gap-3 justify-end">
              <UButton
                variant="soft"
                color="gray"
                @click="isDeleteConfirmOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="red"
                :loading="deleteSubmitting"
                @click="submitDelete"
              >
                Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

// Fetch all registrations
const { data, pending, error, refresh } = await useFetch('/api/registrations');

// Map registrations data
const registrationsData = computed(() => {
  return (data.value?.registrations || []).map((reg: any) => ({
    id: reg.id,
    eventId: reg.eventId,
    categoryId: reg.categoryId,
    applicantName: reg.applicantName,
    applicantEmail: reg.applicantEmail,
    createdAt: reg.createdAt,
  }));
});

// Table columns
const columns = [
  { key: 'eventId', label: 'Event ID', sortable: true },
  { key: 'applicantName', label: 'Applicant Name', sortable: true },
  { key: 'applicantEmail', label: 'Email', sortable: true },
  { key: 'categoryId', label: 'Category', sortable: true },
  { key: 'createdAt', label: 'Registered At', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

// Edit modal state
const isEditModalOpen = ref(false);
const selectedRegistration = ref<any>(null);
const editFormState = reactive({
  applicantName: '',
  categoryId: 0,
});
const editSubmitting = ref(false);

// Delete confirmation state
const isDeleteConfirmOpen = ref(false);
const deleteSubmitting = ref(false);

// Helper functions
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Edit modal handlers
const openEditModal = (registration: any) => {
  selectedRegistration.value = registration;
  editFormState.applicantName = registration.applicantName;
  editFormState.categoryId = registration.categoryId;
  isEditModalOpen.value = true;
};

const submitEdit = async () => {
  try {
    editSubmitting.value = true;

    await $fetch(`/api/registrations/${selectedRegistration.value.id}`, {
      method: 'PUT',
      body: {
        applicantName: editFormState.applicantName,
        categoryId: editFormState.categoryId,
      },
    });

    isEditModalOpen.value = false;
    await refresh();
  } catch (err) {
    console.error('Edit error:', err);
  } finally {
    editSubmitting.value = false;
  }
};

// Delete confirmation handlers
const openDeleteConfirm = (registration: any) => {
  selectedRegistration.value = registration;
  isDeleteConfirmOpen.value = true;
};

const submitDelete = async () => {
  try {
    deleteSubmitting.value = true;

    await $fetch(`/api/registrations/${selectedRegistration.value.id}`, {
      method: 'DELETE',
    });

    isDeleteConfirmOpen.value = false;
    await refresh();
  } catch (err) {
    console.error('Delete error:', err);
  } finally {
    deleteSubmitting.value = false;
  }
};
</script>
