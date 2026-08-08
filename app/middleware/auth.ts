export default defineNuxtRouteMiddleware(async (to) => {
  // Only guard protected routes; public pages (login, signup, /e/[id]) skip this check.
  if (!to.path.startsWith("/dashboard")) {
    return;
  }

  type SessionResponse = Awaited<ReturnType<typeof authClient.getSession>>["data"];

  // The Better Auth Vue client works with relative URLs on the client, but a
  // server-side fetch needs an absolute URL and the incoming request's
  // cookies forwarded explicitly.
  const session = import.meta.server
    ? await $fetch<SessionResponse>("/api/auth/get-session", {
        baseURL: useRequestURL().origin,
        headers: useRequestHeaders(["cookie"]),
      }).catch(() => null)
    : (await authClient.getSession()).data;

  if (!session?.session) {
    return navigateTo({
      path: "/auth/login",
      query: { redirect: to.fullPath },
    });
  }
});
