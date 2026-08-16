export default defineNuxtConfig({
  compatibilityDate: "2026-08-05",
  srcDir: "app/",
  devServer: {
    port: 3456,
  },
  modules: ["@nuxt/ui", "@vueuse/nuxt", "motion-v/nuxt"],
  css: ["~~/assets/css/main.css"],
  icon: {
    // Pre-bundle every icon used in the app so the client never needs a
    // runtime fetch to /api/_nuxt_icon. That fallback fetch relies on
    // relative-URL self-requests, which fail under the Cloudflare Pages
    // dev emulation (nitro.preset below), causing
    // `[Icon] failed to load icon ...` warnings on every page.
    clientBundle: {
      scan: true,
    },
  },
  nitro: {
    preset: "cloudflare_pages",
    experimental: {
      websocket: true,
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
