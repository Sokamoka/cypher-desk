<script setup lang="ts">
// Redirect the bare event URL to the Registration tab, matching the
// previous default (`tab=registration`) behaviour of the query-param setup.
const route = useRoute();

await navigateTo(`/e/${route.params.id}/registration`, {
  replace: true,
  redirectCode: 301,
});
</script>

<template>
  <div />
</template>
