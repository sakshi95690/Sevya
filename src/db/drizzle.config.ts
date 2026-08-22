import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const host = process.env.SQL_HOST || "localhost";
const dbName = process.env.SQL_DB_NAME || "postgres";
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.DATABASE_USERNAME || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.DATABASE_PASSWORD || "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host,
        user,
        password,
        database: dbName,
        ssl: false,
      },
  verbose: true,
});
