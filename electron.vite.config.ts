import path from "path"
import { defineConfig } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: "./example/main.ts",
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: "./example/preload.ts",
        formats: ["cjs"],
      },
    },
  },
  renderer: {
    root: path.resolve(),
    plugins: [react()],
    build: {
      rolldownOptions: {
        input: [path.resolve("./index.html")],
      },
    },
  },
})
