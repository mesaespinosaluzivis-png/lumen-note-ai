import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo-maestro.svg"],
      manifest: {
        name: "Lumen Note AI",
        short_name: "Lumen AI",
        description: "Illuminate insights. Empower intelligent action.",
        theme_color: "#00d4ff",
        background_color: "#0b0e14",
        display: "standalone",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  server: {
    port: 3000
  }
});


