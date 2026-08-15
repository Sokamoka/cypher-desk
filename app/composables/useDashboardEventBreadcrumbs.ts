import type { BreadcrumbItem } from "@nuxt/ui";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

interface DashboardEventBreadcrumbOptions {
  eventId: MaybeRefOrGetter<string | undefined>;
  currentLabel: MaybeRefOrGetter<string>;
  categoryId?: MaybeRefOrGetter<string | undefined>;
  phaseId?: MaybeRefOrGetter<string | undefined>;
  eventLabel?: MaybeRefOrGetter<string | undefined>;
  categoryLabel?: MaybeRefOrGetter<string | undefined>;
  phaseLabel?: MaybeRefOrGetter<string | undefined>;
}

export function useDashboardEventBreadcrumbs(
  options: DashboardEventBreadcrumbOptions,
) {
  return computed<BreadcrumbItem[]>(() => {
    const eventId = toValue(options.eventId);
    const categoryId = options.categoryId
      ? toValue(options.categoryId)
      : undefined;
    const phaseId = options.phaseId ? toValue(options.phaseId) : undefined;

    const eventLabel = toValue(options.eventLabel) || "Event";
    const categoryLabel = toValue(options.categoryLabel) || "Category";
    const phaseLabel = toValue(options.phaseLabel) || "Phase";
    const currentLabel = toValue(options.currentLabel);

    const eventItem: BreadcrumbItem = { label: eventLabel };
    if (eventId) {
      eventItem.to = `/dashboard/event/${eventId}`;
    }

    const items: BreadcrumbItem[] = [
      { label: "Dashboard", to: "/dashboard" },
      eventItem,
    ];

    if (eventId && categoryId) {
      items.push({
        label: categoryLabel,
        to: `/dashboard/event/${eventId}/category/${categoryId}`,
      });
    } else if (categoryId) {
      items.push({ label: categoryLabel });
    }

    if (eventId && categoryId && phaseId) {
      items.push({
        label: phaseLabel,
        to: `/dashboard/event/${eventId}/category/${categoryId}/phase/${phaseId}/board`,
      });
    } else if (phaseId) {
      items.push({ label: phaseLabel });
    }

    items.push({ label: currentLabel });
    return items;
  });
}
