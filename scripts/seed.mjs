import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.local");
const localEnv = existsSync(envFile)
  ? Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
      const separator = line.indexOf("=");
      return separator === -1 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
    }))
  : {};
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? localEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const seedSecret = process.env.SEED_SECRET ?? localEnv.SEED_SECRET;
const response = await fetch(`${baseUrl}/api/seed`, {
  method: "POST",
  headers: {
    ...(seedSecret ? { "x-seed-secret": seedSecret } : {}),
    ...(process.env.RESET_SEED === "true" ? { "x-seed-reset": "true" } : {}),
  },
});

const payload = await response.json();
if (!response.ok) {
  console.error(payload);
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
