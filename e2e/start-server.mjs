/**
 * Boots an ephemeral MongoDB Memory Server + Next.js production server
 * for Playwright. Never points at Atlas/production databases.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MongoMemoryServer } from "mongodb-memory-server";

import {
  buildE2EServerEnv,
  E2E_BASE_URL,
  E2E_PORT,
} from "./fixtures/env.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      reject(
        new Error(
          `E2E port ${port} is unavailable (${String(error)}). Stop other listeners or set E2E_PORT.`,
        ),
      );
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve());
    });
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) {
        return;
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for E2E server at ${url}`);
}

async function main() {
  await assertPortAvailable(E2E_PORT);

  const memory = await MongoMemoryServer.create();
  const mongoUri = memory.getUri("sylqen-e2e");
  const env = buildE2EServerEnv(mongoUri);

  const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

  const child = spawn(process.execPath, [nextCli, "start", "-H", "127.0.0.1", "-p", String(E2E_PORT)], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });

  const shutdown = async () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
    await memory.stop();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(143));
  });

  child.on("exit", (code) => {
    void memory.stop().finally(() => {
      process.exit(code ?? 1);
    });
  });

  try {
    await waitForServer(`${E2E_BASE_URL}/login`);
  } catch (error) {
    await shutdown();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
