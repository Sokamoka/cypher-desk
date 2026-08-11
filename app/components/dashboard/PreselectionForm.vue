<script setup lang="ts">
const state = reactive({
  name: "",
  numberOfCypher: 1,
  groupSize: 1,
  baseCategory: null,
});
function onSubmit() {
  console.log("submit");
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <UFormField label="Phase name" required>
      <UInput v-model="state.name" placeholder="Enter name" />
    </UFormField>

    <UFormField label="Number of Cypher" required>
      <UInputNumber v-model="state.numberOfCypher" />
    </UFormField>

    <UFormField label="Number of groups" required>
      <UInputNumber v-model="state.groupSize" />
    </UFormField>

    <UFormField label="Base Category" required>
      <USelect v-model="state.baseCategory" />
    </UFormField>
  </form>
</template>
