import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Prisma CLI supports `schemas` for multi-schema introspection.
  // Cast to avoid Next.js type-check complaints during build.
  datasource: {
    url:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL,
    schemas: ["public", "auth"],
  } as {
    url?: string;
    schemas?: string[];
  },
});
