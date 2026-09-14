import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // Cloudflare quick tunnels use random *.trycloudflare.com hosts
    allowedHosts: [".trycloudflare.com"],
  },
});
