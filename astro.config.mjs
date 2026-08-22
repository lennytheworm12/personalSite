// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static-only output: every route is prebuilt HTML with zero server runtime.
export default defineConfig({
  output: "static",
  integrations: [react()],
  build: {
    inlineStylesheets: "auto",
  },
});
