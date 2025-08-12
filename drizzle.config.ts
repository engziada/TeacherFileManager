import { defineConfig } from "drizzle-kit";
import path from "node:path";

function resolveSqliteUrl(envUrl?: string) {
  if (!envUrl) return `file:${path.join("./data", "app.db")}`;
  if (envUrl.startsWith("sqlite://")) {
    const p = envUrl.replace("sqlite://", "");
    return p.startsWith("file:") ? p : `file:${p}`;
  }
  // allow passing plain path, ensure file: prefix
  return envUrl.startsWith("file:") ? envUrl : `file:${envUrl}`;
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveSqliteUrl(process.env.DATABASE_URL),
  },
});
