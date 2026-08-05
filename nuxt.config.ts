export default defineNuxtConfig({
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
