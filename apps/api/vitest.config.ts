import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://precept:precept@localhost:5432/precept",
    },
    fileParallelism: false,
  },
});
