import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/database/schema.ts",
  out: "./server/database/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/bc26c27a00cf6f0e45b7ca09b0beff73a7e386128e7488194d07b3cfd2ab58e2.sqlite",
  },
});
