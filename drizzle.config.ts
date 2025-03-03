import { defineConfig } from "drizzle-kit";
import { config} from "dotenv";
config();
console.log(Deno.env.get('DB_URL'));
export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: Deno.env.get('DB_URL')!,
  },
});
