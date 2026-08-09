<script setup lang="ts">
import { useSession, signOut } from "~/utils/auth-client";

interface Props {
  collapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
});

const { data: session } = useSession();

async function handleSignOut() {
  await signOut();
  await navigateTo("/auth/login");
}
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-4">
    <UButton
      v-if="session?.user"
      variant="ghost"
      color="neutral"
      class="w-full"
      :class="{ 'justify-center': collapsed }"
      @click="$refs.menu?.$el?.click?.()"
    >
      <template #leading>
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold text-sm"
        >
          {{ session.user.name?.charAt(0).toUpperCase() || session.user.email.charAt(0).toUpperCase() }}
        </div>
      </template>

      <template v-if="!collapsed" #default>
        <div class="flex flex-col items-start">
          <span class="text-sm font-medium">{{
            session.user.name || session.user.email
          }}</span>
          <span class="text-xs text-muted">{{ session.user.email }}</span>
        </div>
      </template>
    </UButton>

    <UDropdown
      v-if="session?.user"
      :popper="{ placement: 'top-start' }"
      :items="[
        [
          {
            label: 'Sign out',
            icon: 'i-lucide-log-out',
            click: handleSignOut,
          },
        ],
      ]"
    >
      <UButton
        v-if="collapsed"
        icon="i-lucide-chevron-up"
        variant="ghost"
        color="neutral"
        size="sm"
      />
    </UDropdown>
  </div>
</template>
