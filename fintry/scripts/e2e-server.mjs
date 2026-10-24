// Launcher web server untuk Playwright: menyiapkan db_fintry_e2e lalu
// menjalankan `next dev` dengan DATABASE_URL yang diarahkan ke database E2E.
// Dipakai oleh `webServer` di playwright.config.ts.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { deriveE2eUrl, prepareE2eDatabase } from "./prepare-e2e-db.mjs";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.E2E_PORT ?? "3100";

const e2eUrl = deriveE2eUrl();
await prepareE2eDatabase();

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  env: {
    ...process.env,
    DATABASE_URL: e2eUrl,
    BETTER_AUTH_URL: `http://localhost:${port}`,
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
