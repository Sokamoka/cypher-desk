export default defineNuxtConfig({
  compatibilityDate: "2026-08-05",
  srcDir: "app/",
  devServer: {
    port: 3456,
  },
  modules: ["@nuxt/ui", "@vueuse/nuxt", "motion-v/nuxt"],
  css: ["~~/assets/css/main.css"],
  nitro: {
    preset: "cloudflare_pages",
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
