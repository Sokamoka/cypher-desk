import type { BreadcrumbItem } from "@nuxt/ui";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

interface JudgesBreadcrumbOptions {
  eventId: MaybeRefOrGetter<string | undefined>;
  currentLabel: MaybeRefOrGetter<string>;
  categoryId?: MaybeRefOrGetter<string | undefined>;
  phaseId?: MaybeRefOrGetter<string | undefined>;
  cypherId?: MaybeRefOrGetter<string | undefined>;
  eventLabel?: MaybeRefOrGetter<string | undefined>;
  categoryLabel?: MaybeRefOrGetter<string | undefined>;
  phaseLabel?: MaybeRefOrGetter<string | undefined>;
  cypherLabel?: MaybeRefOrGetter<string | undefined>;
}

/**
 * Builds breadcrumbs for the self-service judges flow under `/judges/**`
 * (Event -> Category -> Phase -> Cypher -> Judge), mirroring
 * `useDashboardEventBreadcrumbs` but pointing at `/judges/...` routes
 * instead of `/dashboard/event/...` ones.
 */
export function useJudgesBreadcrumbs(options: JudgesBreadcrumbOptions) {
  return computed<BreadcrumbItem[]>(() => {
    const eventId = toValue(options.eventId);
    const categoryId = options.categoryId
      ? toValue(options.categoryId)
      : undefined;
    const phaseId = options.phaseId ? toValue(options.phaseId) : undefined;
    const cypherId = options.cypherId ? toValue(options.cypherId) : undefined;

    const eventLabel = toValue(options.eventLabel) || "Event";
    const categoryLabel = toValue(options.categoryLabel) || "Category";
    const phaseLabel = toValue(options.phaseLabel) || "Phase";
    const cypherLabel = toValue(options.cypherLabel) || "Cypher";
    const currentLabel = toValue(options.currentLabel);

    const items: BreadcrumbItem[] = [{ label: "Judges", to: "/judges" }];

    if (!eventId) {
      items.push({ label: currentLabel });
      return items;
    }

    const eventItem: BreadcrumbItem = { label: eventLabel, to: `/judges/${eventId}` };
    items.push(eventItem);

    if (categoryId) {
      items.push({
        label: categoryLabel,
        to: `/judges/${eventId}/${categoryId}`,
      });
    }

    if (categoryId && phaseId) {
      items.push({
        label: phaseLabel,
        to: `/judges/${eventId}/${categoryId}/${phaseId}`,
      });
    }

    if (categoryId && phaseId && cypherId) {
      items.push({
        label: cypherLabel,
        to: `/judges/${eventId}/${categoryId}/${phaseId}/${cypherId}`,
      });
    }

    items.push({ label: currentLabel });
    return items;
  });
}
