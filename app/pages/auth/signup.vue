<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Sign up",
  description: "Create an account to get started",
});

const toast = useToast();

const fields = [
  {
    name: "name",
    type: "text" as const,
    label: "Name",
    placeholder: "Enter your name",
  },
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
  },
  {
    name: "password",
    label: "Password",
    type: "password" as const,
    placeholder: "Enter your password",
  },
];

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  email: v.pipe(v.string(), v.email("Invalid email")),
  password: v.pipe(v.string(), v.minLength(8, "Must be at least 8 characters")),
});

type Schema = v.InferOutput<typeof schema>;

const loading = ref(false);

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true;

  const { error } = await signUp.email({
    name: payload.data.name,
    email: payload.data.email,
    password: payload.data.password,
  });

  loading.value = false;

  if (error) {
    toast.add({
      title: "Sign up failed",
      description: error.message ?? "Could not create your account",
      color: "error",
    });
    return;
  }

  await navigateTo("/dashboard");
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :loading="loading"
    title="Create an account"
    :submit="{ label: 'Create account' }"
    @submit="onSubmit"
  >
    <template #description>
      Already have an account?
      <ULink to="/auth/login" class="text-primary font-medium">Login</ULink>.
    </template>

    <template #footer>
      By signing up, you agree to our
      <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
