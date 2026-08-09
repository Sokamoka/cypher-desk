<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { signOut } from "~/utils/auth-client";
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const open = ref(false);

const links = [
  [
    {
      label: "My Events",
      icon: "i-lucide-calendar",
      to: "/dashboard",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
  // [
  //   {
  //     label: "Sign out",
  //     icon: "i-lucide-log-out",
  //     onSelect: async () => {
  //       open.value = false;
  //       await signOut();
  //       await navigateTo("/auth/login");
  //     },
  //   },
  // ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.flat(),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "View page source",
        icon: "simple-icons:github",
        to: `https://github.com/nuxt-ui-templates/dashboard-vue/blob/main/src/pages${route.path === "/" ? "/index" : route.path}.vue`,
        target: "_blank",
      },
    ],
  },
]);
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="text-highlighted font-bold text-xl">
          <template v-if="collapsed"
            >C<span class="text-primary">D</span></template
          >
          <template v-else
            >Cypher<span class="text-primary">Desk</span></template
          >
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <DashboardUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <NuxtPage />
  </UDashboardGroup>
</template>
