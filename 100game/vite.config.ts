import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        contact: resolve(__dirname, "contact.html"),
        passwordReset: resolve(__dirname, "password-reset.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});