export default defineNuxtConfig({
  compatibilityDate: "2026-08-05",
  srcDir: "app/",
  modules: ["@nuxt/ui"],
  nitro: {
    preset: "cloudflare_pages",
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
