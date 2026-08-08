import { createAuthClient } from "better-auth/vue";

/**
 * Client-side Better Auth instance. `baseURL` defaults to same-origin, which
 * is correct for both local dev (Nuxt dev server) and the deployed Cloudflare
 * Pages/Workers app, since `/api/auth/**` is served by the same origin.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
