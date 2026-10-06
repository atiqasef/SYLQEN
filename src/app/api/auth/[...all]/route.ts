import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { connectMongo } from "@/server/db/mongodb";

async function ensureDb() {
  await connectMongo();
}

export async function GET(request: Request) {
  await ensureDb();
  const handlers = toNextJsHandler(auth);
  return handlers.GET(request);
}

export async function POST(request: Request) {
  await ensureDb();
  const handlers = toNextJsHandler(auth);
  return handlers.POST(request);
}
