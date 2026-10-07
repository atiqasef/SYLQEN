import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Collection, MongoClient } from "mongodb";

import { getDb, setMongoClientForTests } from "@/server/db/mongodb";
import {
  ensureInvoiceIndexes,
  resetInvoiceIndexesForTests,
} from "@/server/invoices/repository";

describe("ensureInvoiceIndexes process guard", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-invoice-indexes";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetInvoiceIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetInvoiceIndexesForTests();
    await client.db().dropDatabase();
  });

  it("creates dashboard issueDate index alongside existing invoice indexes", async () => {
    await ensureInvoiceIndexes();

    const indexes = await getDb().collection("invoices").indexes();
    const names = indexes.map((index) => index.name);

    expect(names).toContain("invoices_workspace_invoiceNumber_unique");
    expect(names).toContain("invoices_workspace_createdAt");
    expect(names).toContain("invoices_workspace_issueDate");
  });

  it("reuses a single in-flight/completed ensure across concurrent callers", async () => {
    const spy = vi.spyOn(Collection.prototype, "createIndexes");

    await Promise.all([
      ensureInvoiceIndexes(),
      ensureInvoiceIndexes(),
      ensureInvoiceIndexes(),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    await ensureInvoiceIndexes();
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
