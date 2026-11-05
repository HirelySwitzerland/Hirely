/*
 * Build on Vercel. When a database is connected (DATABASE_URL), its tables are brought up to date first
 * (prisma db push – it refuses changes that would delete data). Without a database it only builds the website.
 */
import { execSync } from "node:child_process";

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

run("npx prisma generate");
if (process.env.DATABASE_URL && process.env.DB_PUSH_ON_BUILD !== "0") {
  const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  console.log("Updating the database tables …");
  run("npx prisma db push --skip-generate", { DATABASE_URL: direct });
}
run("npx next build");
