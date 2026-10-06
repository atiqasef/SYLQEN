import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Collection, MongoClient } from "mongodb";

import {
  ensureCustomerIndexes,
  resetCustomerIndexesForTests,
} from "@/server/customers/repository";
import { getDb, setMongoClientForTests } from "@/server/db/mongodb";

describe("ensureCustomerIndexes process guard", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-customer-indexes";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetCustomerIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetCustomerIndexesForTests();
    await client.db().dropDatabase();
  });

  it("creates the expected customer indexes once", async () => {
    await ensureCustomerIndexes();

    const indexes = await getDb().collection("customers").indexes();
    const names = indexes.map((index) => index.name);

    expect(names).toContain("customers_workspace_createdAt");
    expect(names).toContain("customers_workspace_email_unique");
    expect(names).toContain("customers_workspace_name");
  });

  it("reuses a single in-flight/completed ensure across concurrent callers", async () => {
    const spy = vi.spyOn(Collection.prototype, "createIndexes");

    await Promise.all([
      ensureCustomerIndexes(),
      ensureCustomerIndexes(),
      ensureCustomerIndexes(),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);

    await ensureCustomerIndexes();
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it("retries after a failed ensure", async () => {
    const spy = vi
      .spyOn(Collection.prototype, "createIndexes")
      .mockRejectedValueOnce(new Error("transient index failure"));

    await expect(ensureCustomerIndexes()).rejects.toThrow(
      /transient index failure/,
    );

    spy.mockRestore();

    await expect(ensureCustomerIndexes()).resolves.toBeUndefined();

    const indexes = await getDb().collection("customers").indexes();
    expect(indexes.map((index) => index.name)).toContain(
      "customers_workspace_email_unique",
    );
  });
});
