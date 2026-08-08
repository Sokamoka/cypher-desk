<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Login",
  description: "Login to your account to continue",
});

const toast = useToast();
const route = useRoute();

const fields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password" as const,
    placeholder: "Enter your password",
  },
];

const schema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email")),
  password: v.pipe(v.string(), v.minLength(8, "Must be at least 8 characters")),
});

type Schema = v.InferOutput<typeof schema>;

const loading = ref(false);

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true;

  const { error } = await signIn.email({
    email: payload.data.email,
    password: payload.data.password,
  });

  loading.value = false;

  if (error) {
    toast.add({
      title: "Login failed",
      description: error.message ?? "Invalid email or password",
      color: "error",
    });
    return;
  }

  const redirect = (route.query.redirect as string) || "/dashboard";
  await navigateTo(redirect);
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :loading="loading"
    title="Welcome back"
    icon="i-lucide-lock"
    @submit="onSubmit"
  >
    <template #description>
      Don't have an account?
      <ULink to="/auth/signup" class="text-primary font-medium">Sign up</ULink>.
    </template>

    <template #footer>
      By signing in, you agree to our
      <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
