import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/preload.ts", "./src/main.ts", "./src/renderer.ts"],
})
