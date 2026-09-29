// Cross-platform first-time setup: creates .env with a fresh encryption key (Windows, macOS, Linux).
import fs from "node:fs";
import crypto from "node:crypto";

if (fs.existsSync(".env")) {
  console.log(".env already exists — leaving it unchanged.");
} else {
  let env = fs.readFileSync(".env.example", "utf8");
  const pw = process.argv[2] ?? "postgres";
  env = env
    .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="postgresql://postgres:${pw}@localhost:5432/hirely"`)
    .replace(/^APP_ENCRYPTION_KEY=.*$/m, `APP_ENCRYPTION_KEY="${crypto.randomBytes(32).toString("base64")}"`)
    .replace(/^AUTOMATION_TIME_SCALE=.*$/m, `AUTOMATION_TIME_SCALE="0.005"`);
  fs.writeFileSync(".env", env);
  console.log(`.env created (database user "postgres", password "${pw}"). Edit DATABASE_URL in .env if your password differs.`);
}
