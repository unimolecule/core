import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "basic",
          include: ["tests/*.test.ts"],
          environment: "node",
          globals: false,
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "node",
          include: ["tests/node/**/*.test.ts"],
          environment: "node",
          globals: false,
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "web",
          include: ["tests/web/**/*.test.ts"],
          environment: "jsdom",
          globals: false,
          clearMocks: true,
          restoreMocks: true,
        },
      },
    ],
  },
});
