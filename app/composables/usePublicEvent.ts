import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

export interface PublicEventCategory {
  id: string;
  name: string;
  participants: string[];
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  judges: { name: string }[];
  slug: string;
  categories: PublicEventCategory[];
}

/**
 * Fetches the public event payload once per event id and shares it across the
 * parent `/e/[id]` layout and its nested child routes (live/participants/
 * registration) via `useState`, avoiding a duplicate fetch per page.
 */
export function usePublicEvent(id: MaybeRefOrGetter<string>) {
  const eventId = computed(() => toValue(id));

  const { data, pending, error, refresh } = useFetch<{
    success: boolean;
    event: PublicEvent;
  }>(() => `/api/public/events/${eventId.value}`, {
    key: () => `public-event-${eventId.value}`,
  });

  const eventData = computed(() => data.value?.event ?? null);
  const hasCategories = computed(
    () => (eventData.value?.categories.length ?? 0) > 0,
  );

  return { data, pending, error, refresh, eventData, hasCategories };
}
