import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    pool: "vmThreads",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/App.tsx",
        "src/hooks/useLocationCriteria.ts",
        "src/hooks/useLocationData.ts",
        "src/location-utils.ts",
        "src/components/FilterSidebar.tsx",
        "src/components/LocationActions.tsx",
        "src/components/LocationResult.tsx",
        "src/components/LocationResults.tsx",
        "src/components/SearchForm.tsx",
      ],
      exclude: ["src/**/*.d.ts"],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
      reporter: ["text", "html"],
    },
  },
});
