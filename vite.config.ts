import { defineConfig } from "vite";

export default defineConfig({
  // Project Pages site (https://randallard.github.io/cycle-in/) — every
  // asset path needs this prefix, or the deployed build 404s on everything
  // but index.html.
  base: "/cycle-in/",
});
