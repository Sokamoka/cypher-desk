import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import type { H3Event } from "h3";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "~~/server/database/schema";

/**
 * Cloudflare Workers only expose bindings (like the D1 `DB` binding) on
 * `event.context.cloudflare.env` per-request — there is no binding available
 * at module load time. Because of this, the Better Auth instance cannot be a
 * top-level singleton; instead we lazily build (and cache) one instance per
 * D1 binding so repeated requests within the same Worker isolate reuse it.
 */
const authInstances = new WeakMap<object, ReturnType<typeof buildAuth>>();

function buildAuth(db: D1Database, secret: string, baseURL: string) {
  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(drizzle(db), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
  });
}

export function getAuth(event: H3Event) {
  const cloudflare = event.context.cloudflare;
  const db = cloudflare?.env?.DB;

  if (!db) {
    throw createError({
      statusCode: 500,
      message: "Cloudflare D1 binding (DB) is not available on this request",
    });
  }

  // Nitro's Cloudflare dev emulation loads `.env.local` into `cloudflare.env`
  // automatically, and `wrangler.toml` `[vars]`/secrets populate it in
  // production — no `process.env` fallback needed here.
  const secret = cloudflare.env.BETTER_AUTH_SECRET;
  const baseURL = cloudflare.env.BETTER_AUTH_URL ?? "http://localhost:3456";

  if (!secret) {
    throw createError({
      statusCode: 500,
      message: "BETTER_AUTH_SECRET is not configured",
    });
  }

  let auth = authInstances.get(db);
  if (!auth) {
    auth = buildAuth(db, secret, baseURL);
    authInstances.set(db, auth);
  }

  return auth;
}

/**
 * Validates the Better Auth session for the current request and returns the
 * authenticated user, or throws a 401 error. Use this at the top of every
 * protected `server/api/**` handler before touching user-owned data.
 */
export async function requireSessionUser(event: H3Event) {
  const auth = getAuth(event);
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  return session.user;
}
