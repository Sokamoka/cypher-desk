<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { CreateEventSchema, type UpdateEvent } from "~~/utils/schemas";

const EditEventFormSchema = CreateEventSchema;

definePageMeta({
  layout: "dashboard",
  middleware: "auth",
  name: "categories",
});

const route = useRoute();
const eventId = computed(() => route.params.eventId as string);
const toast = useToast();

interface EventCategory {
  id: string;
  name: string;
}

interface DashboardEvent {
  id: string;
  title: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
  slug: string;
  createdAt: string;
}

const { data, pending, error } = await useFetch<{
  success: boolean;
  event: DashboardEvent;
  categories: EventCategory[];
}>(() => `/api/events/${eventId.value}`);

const eventData = computed(() => data.value?.event ?? null);
const categories = computed(() => data.value?.categories ?? []);
const breadcrumbItems = useDashboardEventBreadcrumbs({
  eventId,
  eventLabel: computed(() => eventData.value?.title),
  currentLabel: "Categories",
});

useSeoMeta({
  title: () =>
    eventData.value ? `${eventData.value.title} — Categories` : "Event",
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const isEditModalOpen = ref(false);
const editing = ref(false);
const editLoading = ref(false);
const originalCategories = ref<EventCategory[]>([]);

const editFormState = reactive({
  title: "",
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  judges: [] as { name: string }[],
  categories: [] as string[],
});

async function openEditModal() {
  isEditModalOpen.value = true;
  editLoading.value = true;

  try {
    const detail = await $fetch<{
      success: boolean;
      event: DashboardEvent;
      categories: EventCategory[];
    }>(`/api/events/${eventId.value}`);

    editFormState.title = detail.event.title;
    editFormState.description = detail.event.description ?? "";
    editFormState.location = detail.event.location;
    editFormState.startDate = detail.event.startDate;
    editFormState.endDate = detail.event.endDate;
    editFormState.judges = detail.event.judges ?? [];
    editFormState.categories = detail.categories.map((c) => c.name);
    originalCategories.value = detail.categories;
  } catch (err: any) {
    toast.add({
      title: "Failed to load event",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
    isEditModalOpen.value = false;
  } finally {
    editLoading.value = false;
  }
}

async function onUpdateEvent() {
  editing.value = true;

  try {
    const categories = editFormState.categories.map((name) => {
      const existing = originalCategories.value.find((c) => c.name === name);
      return existing ? { id: existing.id, name } : { name };
    });

    await $fetch(`/api/events/${eventId.value}`, {
      method: "PUT",
      body: {
        title: editFormState.title,
        description: editFormState.description,
        location: editFormState.location,
        startDate: editFormState.startDate,
        endDate: editFormState.endDate,
        judges: editFormState.judges,
        categories,
      } satisfies UpdateEvent,
    });

    toast.add({ title: "Event updated", color: "success" });
    isEditModalOpen.value = false;
    await refreshNuxtData();
  } catch (err: any) {
    toast.add({
      title: "Failed to update event",
      description: err?.data?.message ?? "Please try again",
      color: "error",
    });
  } finally {
    editing.value = false;
  }
}

const columns: TableColumn<EventCategory>[] = [
  { accessorKey: "name", header: "Category" },
  { id: "actions", header: "" },
];
</script>

<template>
  <UDashboardPanel id="dashboard-event-detail">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <UBreadcrumb :items="breadcrumbItems" color="neutral" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <DashboardEventButtonGroup :eventId />
        </template>

        <template #right>
          <UButton
            label="Edit Event"
            icon="i-lucide-pencil"
            color="primary"
            @click="openEditModal"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="pending" class="space-y-4">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-64 w-full" />
        </div>

        <div
          v-else-if="error || !eventData"
          class="bg-error/10 border border-error/30 rounded-lg p-4"
        >
          <p class="text-error">
            Failed to load this event. Please try again later.
          </p>
        </div>

        <template v-else>
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Categories</h2>
                <UBadge color="primary" variant="soft">
                  {{ categories.length }} categories
                </UBadge>
              </div>
            </template>

            <div v-if="categories.length === 0" class="text-center py-12">
              <p class="text-muted">No categories added for this event yet.</p>
            </div>

            <UTable v-else :data="categories" :columns="columns">
              <template #actions-cell="{ row }">
                <div class="flex gap-2">
                  <UButton
                    icon="i-lucide-pencil"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    :to="`/dashboard/event/${eventData.id}/category/${row.original.id}`"
                  >
                    Manage
                  </UButton>
                </div>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>

      <UModal v-model:open="isEditModalOpen" title="Edit Event">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Edit Event</h2>
            </template>

            <div v-if="editLoading" class="space-y-4">
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-24 w-full" />
            </div>

            <DashboardEventForm
              v-else
              :schema="EditEventFormSchema"
              :state="editFormState"
              submit-label="Save Changes"
              :submit-loading="editing"
              @submit="onUpdateEvent"
              @cancel="isEditModalOpen = false"
            />
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
