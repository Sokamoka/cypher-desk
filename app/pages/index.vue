<script setup lang="ts">
const colorMode = useColorMode();

const color = computed(() =>
  colorMode.value === "dark" ? "#09090b" : "white",
);

const heroTitle = {
  primary: "CypherDesk",
  secondary: "Master the Jam",
};

const page = {
  hero: {
    headline: "The All-in-One Platform for Street Dance Events",
    links: [
      {
        label: "Events",
        color: "primary",
        size: "xl",
        to: "/events",
      },
      {
        label: "Admin",
        color: "neutral",
        size: "xl",
        variant: "soft",
        to: "/admin",
      },
    ],
  },
  description:
    "Streamline tournament brackets, live judge scoring, and real-time timetables—so you can stop worrying about logistics and focus on bringing the hype to the floor.",
} as const;

definePageMeta({
  layout: "default",
  colorMode: "dark",
});

useHead({
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: color },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "en",
  },
});

function enterMotion(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay },
  };
}

function staggerMotion(index: number = 0) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    inViewOptions: { once: true, amount: 1 },
    transition: { duration: 0.6, delay: index * 0.08 },
  };
}
</script>

<template>
  <div>
    <AppHeader />

    <UMain>
      <!-- Hero -->
      <UPageHero
        :ui="{
          root: 'pb-24 sm:pb-32',
          container: 'relative z-10 lg:py-32',
          wrapper: 'flex flex-col items-center',
          title:
            'sm:text-6xl lg:text-7xl xl:text-[80px] tracking-tighter leading-[1.05]',
          description:
            'mt-5 max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-default',
          links: 'gap-3',
        }"
      >
        <template #top>
          <Motion v-bind="staggerMotion(0)">
            <HeroShaders class="absolute top-0 inset-x-0 opacity-15 h-full" />
          </Motion>

          <GradientGlow class="top-0 w-2/3 h-1/2" />
        </template>

        <template #headline>
          <Motion v-bind="enterMotion(0.2)">
            <UBadge
              color="neutral"
              variant="soft"
              :label="page.hero.headline"
              class="rounded-full px-3 py-1.5 gap-1.5 bg-white/5 backdrop-blur"
            >
              <template #leading>
                <UChip
                  inset
                  standalone
                  :ui="{ base: 'animate-pulse ring-0' }"
                />
              </template>
            </UBadge>
          </Motion>
        </template>

        <template #title>
          <Motion as="span" v-bind="enterMotion(0.35)" class="inline-block">
            {{ heroTitle.primary }}
            <br v-if="heroTitle.secondary" />
            <span
              v-if="heroTitle.secondary"
              class="animate-shimmer bg-size-[200%_auto] bg-clip-text text-transparent"
              :style="{
                backgroundImage:
                  'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300), var(--color-primary-400))',
                animationDuration: '10s',
              }"
            >
              {{ heroTitle.secondary }}
            </span>
          </Motion>
        </template>

        <template #description>
          <Motion as="span" v-bind="enterMotion(0.5)" class="inline-block">
            {{ page.description }}
          </Motion>
        </template>

        <template #links>
          <Motion
            class="flex flex-wrap justify-center gap-6"
            v-bind="enterMotion(0.65)"
          >
            <UButton
              v-for="(link, index) in page.hero.links"
              :key="index"
              v-bind="link"
            />
          </Motion>
        </template>
      </UPageHero>
    </UMain>

    <AppFooter />
  </div>
</template>
