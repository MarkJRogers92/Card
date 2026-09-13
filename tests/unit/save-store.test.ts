import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  M19_TEST_ACT_REWARD_CATALOG,
  advanceRunNode,
  applyDirectDamage,
  beginRunNode,
  claimRewardOption,
  completeRunCombat,
  createDirectDamagePacket,
  createM19Run,
  exportSave,
  hashAuthoritativeState,
  type AuthoritativeState,
} from "../../src/engine";
import {
  ACTIVE_SLOT_KEY,
  BACKUP_SLOT_KEYS,
  QUARANTINE_SLOT_KEY,
  createIndexedDbBackend,
  createSaveStore,
  openSaveDatabase,
  type QuarantineRecord,
  type SaveBackend,
  type SaveStore,
} from "../../src/platform";

const SLOT_KEYS = [ACTIVE_SLOT_KEY, ...BACKUP_SLOT_KEYS];

function freshDatabase(): Promise<IDBDatabase> {
  return openSaveDatabase(new IDBFactory());
}

/** A run that has just resolved its first encounter into a pending reward. */
function resolveFirstEncounter(seed: number): {
  readonly state: AuthoritativeState;
  readonly transactionId: string;
  readonly optionId: string;
} {
  const started = beginRunNode(createM19Run(seed));
  let won = started;
  for (const actorId of started.combat?.enemyOrder ?? []) {
    const actor = won.combat?.actors[actorId];
    if (actor === undefined || actor.hp === 0) continue;
    won = applyDirectDamage(
      won,
      actorId,
      createDirectDamagePacket(actor.hp + actor.block),
    ).state;
  }
  const rewarded = completeRunCombat(won, M19_TEST_ACT_REWARD_CATALOG);
  const pending = rewarded.rewards.pending;
  const optionId = pending?.choices[0]?.options[0]?.id;
  if (pending === null || pending === undefined || optionId === undefined) {
    throw new Error("Expected a pending M19 reward with a card option.");
  }
  return {
    state: rewarded,
    transactionId: pending.transactionId,
    optionId,
  };
}

/** A run whose first reward has been claimed exactly once. */
function runWithClaim(seed: number): {
  readonly state: AuthoritativeState;
  readonly transactionId: string;
  readonly optionId: string;
} {
  const resolved = resolveFirstEncounter(seed);
  return {
    ...resolved,
    state: claimRewardOption(resolved.state, resolved.transactionId, resolved.optionId),
  };
}

/**
 * Committing into an empty store, a one-generation store, and a
 * two-generation store produces commits of one, two, and three writes. Those
 * are the three transaction boundaries this suite interrupts.
 */
function generationStates(): readonly AuthoritativeState[] {
  return [
    createM19Run(1900),
    beginRunNode(createM19Run(1900)),
    advanceRunNode(runWithClaim(1900).state),
  ];
}

/**
 * A backend that lost atomicity: it applies the first `failAfter` writes as
 * separate transactions and then dies, as a crashing substrate would.
 */
function tornBackend(database: IDBDatabase, failAfter: number): SaveBackend {
  const inner = createIndexedDbBackend(database);
  return {
    read: (key: string) => inner.read(key),
    async commit(writes): Promise<void> {
      for (let index = 0; index < writes.length; index += 1) {
        if (index === failAfter) {
          throw new Error(`simulated crash after ${failAfter} write(s)`);
        }
        await inner.commit([writes[index]!]);
      }
    },
    close: () => inner.close(),
  };
}

/** A backend that aborts the genuine IndexedDB transaction at one boundary. */
function abortingBackend(database: IDBDatabase, failAtWrite: number): SaveBackend {
  return createIndexedDbBackend(database, {
    beforeWrite: (_write, index, transaction) => {
      if (index === failAtWrite) {
        transaction.abort();
      }
    },
  });
}

/**
 * A backend whose acknowledgement is lost: the transaction commits durably and
 * then the caller is told it failed, as a process that dies after the commit
 * but before the caller resumes would report.
 */
function lostAcknowledgementBackend(database: IDBDatabase): SaveBackend {
  const inner = createIndexedDbBackend(database);
  return {
    read: (key: string) => inner.read(key),
    async commit(writes): Promise<void> {
      await inner.commit(writes);
      throw new Error("acknowledgement lost after a durable commit");
    },
    close: () => inner.close(),
  };
}

/**
 * A backend that dies before its final write, which is the interruption shape
 * that would destroy the last good generation if a damaged slot were rotated
 * over it.
 */
function tornBeforeLastWriteBackend(database: IDBDatabase): SaveBackend {
  const inner = createIndexedDbBackend(database);
  return {
    read: (key: string) => inner.read(key),
    async commit(writes): Promise<void> {
      for (let index = 0; index < writes.length - 1; index += 1) {
        await inner.commit([writes[index]!]);
      }
      throw new Error("simulated crash before the final write");
    },
    close: () => inner.close(),
  };
}

/**
 * A key/value backend whose keys and record labels are independent, which is
 * how a label mismatch can reach the store at all. IndexedDB's keyPath store
 * always files a record under the label it carries.
 */
function memoryBackend(records: Map<string, unknown>): SaveBackend {
  return {
    read: (key: string) => Promise.resolve(records.get(key)),
    async commit(writes): Promise<void> {
      for (const write of writes) {
        if (write.value === null) {
          records.delete(write.key);
        } else {
          records.set(write.key, write.value);
        }
      }
    },
    close: () => undefined,
  };
}

async function requireLoaded(store: SaveStore) {
  const result = await store.load();
  if (!result.ok) {
    throw new Error(`Expected a loadable save, received ${result.code}.`);
  }
  return result;
}

describe("M21 save store generations", () => {
  it("reports an empty store on the first run instead of failing", async () => {
    const store = createSaveStore({
      backend: createIndexedDbBackend(await freshDatabase()),
    });

    const result = await store.load();

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "empty", rejected: [] });
  });

  it("commits one generation and rotates two backups", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const [first, second, third] = generationStates();

    expect(await store.commit(first!)).toStrictEqual({ ok: true, generation: 1 });
    expect(await store.commit(second!)).toStrictEqual({ ok: true, generation: 2 });
    expect(await store.commit(third!)).toStrictEqual({ ok: true, generation: 3 });

    const raw = createIndexedDbBackend(database);
    const generations = await Promise.all(
      SLOT_KEYS.map(async (slot) => ((await raw.read(slot)) as { generation: number }).generation),
    );
    expect(generations).toStrictEqual([3, 2, 1]);

    const loaded = await requireLoaded(store);
    expect(loaded).toMatchObject({ slot: "active", generation: 3, repairedOnDisk: false });
    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(third!));
  });

  it("round-trips a claimed reward and its completed transaction history", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const claim = runWithClaim(1900);

    expect(await store.commit(claim.state)).toMatchObject({ ok: true, generation: 1 });
    const loaded = await requireLoaded(store);

    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(claim.state));
    expect(loaded.state.rewards.scrap).toBe(15);
    expect(loaded.state.rewards.completedTransactionIds).toStrictEqual([
      claim.transactionId,
    ]);
  });

  it("commits the run and the reserved profile payload as one generation", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const [first, second] = generationStates();

    await store.commit(first!, { profile: { evidence: 1 } });
    expect(await store.readProfile()).toStrictEqual({
      ok: true,
      profile: { evidence: 1 },
    });

    const interrupted = await createSaveStore({
      backend: abortingBackend(database, 0),
    }).commit(second!, { profile: { evidence: 2 } });
    expect(interrupted.ok).toBe(false);

    const loaded = await requireLoaded(store);
    expect(loaded.generation).toBe(1);
    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(first!));
    expect(await store.readProfile()).toStrictEqual({
      ok: true,
      profile: { evidence: 1 },
    });
  });

  it("clears every slot on request", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    await store.commit(createM19Run(1900));
    await store.clear();

    expect(await store.load()).toMatchObject({ ok: false, code: "empty" });
  });
});

describe("M21 fault injection at every transaction boundary", () => {
  /** The state an interrupted store must still return, or null when empty. */
  async function priorGeneration(
    store: SaveStore,
    committed: number,
  ): Promise<{ readonly generation: number; readonly hash: string } | null> {
    if (committed === 0) {
      return null;
    }
    const loaded = await requireLoaded(store);
    return { generation: loaded.generation, hash: hashAuthoritativeState(loaded.state) };
  }

  async function expectUnchanged(
    store: SaveStore,
    before: { readonly generation: number; readonly hash: string } | null,
  ): Promise<void> {
    if (before === null) {
      expect(await store.load()).toMatchObject({ ok: false, code: "empty" });
      return;
    }
    const loaded = await requireLoaded(store);
    expect(loaded.generation).toBe(before.generation);
    expect(hashAuthoritativeState(loaded.state)).toBe(before.hash);
    expect(loaded.repairedOnDisk).toBe(false);
  }

  for (let writes = 1; writes <= 3; writes += 1) {
    for (let boundary = 0; boundary < writes; boundary += 1) {
      it(`aborts a ${writes}-write commit at boundary ${boundary + 1} without changing storage`, async () => {
        const database = await freshDatabase();
        const store = createSaveStore({ backend: createIndexedDbBackend(database) });
        const states = generationStates();
        for (let index = 0; index < writes - 1; index += 1) {
          expect((await store.commit(states[index]!)).ok).toBe(true);
        }
        const before = await priorGeneration(store, writes - 1);
        const raw = createIndexedDbBackend(database);
        const beforeSlots = await Promise.all(SLOT_KEYS.map((slot) => raw.read(slot)));

        const result = await createSaveStore({
          backend: abortingBackend(database, boundary),
        }).commit(states[writes - 1]!);

        expect(result).toMatchObject({ ok: false, code: "write_failed" });
        const afterSlots = await Promise.all(SLOT_KEYS.map((slot) => raw.read(slot)));
        expect(afterSlots).toStrictEqual(beforeSlots);
        await expectUnchanged(store, before);
      });

      it(`recovers the last valid generation after a torn write at boundary ${boundary + 1} of ${writes}`, async () => {
        const database = await freshDatabase();
        const store = createSaveStore({ backend: createIndexedDbBackend(database) });
        const states = generationStates();
        for (let index = 0; index < writes - 1; index += 1) {
          expect((await store.commit(states[index]!)).ok).toBe(true);
        }
        const before = await priorGeneration(store, writes - 1);

        const result = await createSaveStore({
          backend: tornBackend(database, boundary),
        }).commit(states[writes - 1]!);

        expect(result).toMatchObject({ ok: false, code: "write_failed" });
        await expectUnchanged(store, before);
      });
    }
  }

  it("never applies a claimed reward twice when the commit is interrupted", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const claim = runWithClaim(1900);
    const claimedHash = hashAuthoritativeState(claim.state);
    await store.commit(claim.state);

    const interrupted = await createSaveStore({
      backend: abortingBackend(database, 1),
    }).commit(advanceRunNode(claim.state));
    expect(interrupted.ok).toBe(false);

    const reloaded = await requireLoaded(store);
    expect(reloaded.generation).toBe(1);
    expect(hashAuthoritativeState(reloaded.state)).toBe(claimedHash);
    expect(reloaded.state.rewards.scrap).toBe(15);
    expect(reloaded.state.run?.currentNodeId).toBe("ordinary_1");

    const reclaimed = claimRewardOption(
      reloaded.state,
      claim.transactionId,
      claim.optionId,
    );
    expect(reclaimed.rewards.scrap).toBe(15);
    expect(reclaimed.rewards.claimedCardIds).toStrictEqual([claim.optionId]);
    expect(reclaimed.rewards.completedTransactionIds).toStrictEqual([
      claim.transactionId,
    ]);
  });

  it("applies an interrupted claim exactly once when it is retried", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const resolved = resolveFirstEncounter(1900);
    await store.commit(resolved.state);
    const claimed = claimRewardOption(
      resolved.state,
      resolved.transactionId,
      resolved.optionId,
    );

    // Interrupt the commit that would install the claim itself.
    const interrupted = await createSaveStore({
      backend: abortingBackend(database, 1),
    }).commit(claimed);
    expect(interrupted).toMatchObject({ ok: false, code: "write_failed" });

    const reloaded = await requireLoaded(store);
    expect(reloaded.generation).toBe(1);
    expect(reloaded.state.rewards.pending?.transactionId).toBe(resolved.transactionId);
    expect(reloaded.state.rewards.claimedCardIds).toStrictEqual([]);

    const retried = claimRewardOption(
      reloaded.state,
      resolved.transactionId,
      resolved.optionId,
    );
    expect(retried.rewards.claimedCardIds).toStrictEqual([resolved.optionId]);
    expect(retried.rewards.completedTransactionIds).toStrictEqual([
      resolved.transactionId,
    ]);
  });

  it("treats a lost acknowledgement as a durable generation rather than a duplicate", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const claim = runWithClaim(1900);
    await store.commit(claim.state);

    const unacknowledged = await createSaveStore({
      backend: lostAcknowledgementBackend(database),
    }).commit(advanceRunNode(claim.state));
    expect(unacknowledged).toMatchObject({ ok: false, code: "write_failed" });

    const loaded = await requireLoaded(store);
    expect(loaded.generation).toBe(2);
    expect(loaded.state.rewards.scrap).toBe(15);
    expect(loaded.state.rewards.completedTransactionIds).toStrictEqual([
      claim.transactionId,
    ]);
    expect(loaded.state.rewards.claimedCardIds).toStrictEqual([claim.optionId]);
  });
});

describe("M21 recovery", () => {
  it("quarantines a corrupt active record and repairs the store from backup.1", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const raw = createIndexedDbBackend(database);
    const [first, second] = generationStates();
    await store.commit(first!);
    await store.commit(second!);

    const corrupt = '{"saveVersion":1,"snapshot":{}}';
    await raw.commit([
      {
        key: ACTIVE_SLOT_KEY,
        value: { key: ACTIVE_SLOT_KEY, generation: 2, text: corrupt, profile: null },
      },
    ]);

    const loaded = await requireLoaded(store);
    expect(loaded).toMatchObject({
      slot: "backup.1",
      generation: 1,
      repairedOnDisk: true,
    });
    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(first!));
    expect(loaded.rejected).toHaveLength(1);
    expect(loaded.rejected[0]).toMatchObject({
      slot: "active",
      code: "invalid_envelope",
    });

    const quarantine = (await raw.read(QUARANTINE_SLOT_KEY)) as QuarantineRecord;
    expect(quarantine.entries).toHaveLength(1);
    expect(quarantine.entries[0]).toMatchObject({
      slot: "active",
      generation: 2,
      code: "invalid_envelope",
      text: corrupt,
    });
    const repairedActive = (await raw.read(ACTIVE_SLOT_KEY)) as { text: string };
    expect(repairedActive.text).toBe(exportSave(first!));

    // The repair is idempotent: loading again adds no duplicate history.
    const again = await requireLoaded(store);
    expect(again).toMatchObject({ slot: "active", generation: 1, repairedOnDisk: false });
    const unchanged = (await raw.read(QUARANTINE_SLOT_KEY)) as QuarantineRecord;
    expect(unchanged.entries).toHaveLength(1);
  });

  it("keeps the only valid generation when the newer slots are corrupt", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const raw = createIndexedDbBackend(database);
    const [first] = generationStates();
    await store.commit(first!);

    // `active` and `backup.1` are damaged; only `backup.2` still holds a valid
    // generation. Rotating either damaged record over it would lose the run.
    await raw.commit([
      {
        key: ACTIVE_SLOT_KEY,
        value: { key: ACTIVE_SLOT_KEY, generation: 2, text: "{}", profile: null },
      },
      {
        key: BACKUP_SLOT_KEYS[0],
        value: { key: BACKUP_SLOT_KEYS[0], generation: 2, text: "{}", profile: null },
      },
      {
        key: BACKUP_SLOT_KEYS[1],
        value: {
          key: BACKUP_SLOT_KEYS[1],
          generation: 1,
          text: exportSave(first!),
          profile: null,
        },
      },
    ]);

    const attempted = await createSaveStore({
      backend: tornBeforeLastWriteBackend(database),
    }).commit(beginRunNode(first!));
    expect(attempted).toMatchObject({ ok: false, code: "write_failed" });

    const survived = (await raw.read(BACKUP_SLOT_KEYS[1])) as { text: string };
    expect(survived.text).toBe(exportSave(first!));

    const recovered = await requireLoaded(store);
    expect(hashAuthoritativeState(recovered.state)).toBe(hashAuthoritativeState(first!));
    expect(recovered.rejected).toHaveLength(2);
    expect(recovered.rejected.map((entry) => entry.slot)).toStrictEqual([
      "active",
      "backup.1",
    ]);
  });

  it("rejects a record whose label does not match its slot", async () => {
    const [first, second] = generationStates();
    const records = new Map<string, unknown>([
      [
        ACTIVE_SLOT_KEY,
        {
          key: BACKUP_SLOT_KEYS[0],
          generation: 999,
          text: exportSave(second!),
          profile: null,
        },
      ],
      [
        BACKUP_SLOT_KEYS[0],
        {
          key: BACKUP_SLOT_KEYS[0],
          generation: 1,
          text: exportSave(first!),
          profile: null,
        },
      ],
    ]);
    const store = createSaveStore({ backend: memoryBackend(records) });

    // The mislabelled record claims generation 999 but is not a valid `active`
    // record, so the newest generation that is actually loadable wins.
    const loaded = await requireLoaded(store);
    expect(loaded).toMatchObject({ slot: "backup.1", generation: 1 });
    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(first!));
    expect(loaded.rejected).toHaveLength(1);
    expect(loaded.rejected[0]).toMatchObject({ slot: "active", code: "invalid_record" });
    expect(loaded.rejected[0]?.message).toContain("labelled backup.1");
  });

  it("never deletes anything when every generation is unreadable", async () => {
    const database = await freshDatabase();
    const store = createSaveStore({ backend: createIndexedDbBackend(database) });
    const raw = createIndexedDbBackend(database);
    await store.commit(createM19Run(1900));

    const broken = SLOT_KEYS.map((slot) => ({
      key: slot,
      value: { key: slot, generation: 1, text: "{}", profile: null },
    }));
    await raw.commit(broken);

    const result = await store.load();
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "no_valid_generation" });
    expect(result.rejected).toHaveLength(3);

    for (const write of broken) {
      const stored = (await raw.read(write.key)) as { text: string };
      expect(stored.text).toBe("{}");
    }
    expect(await raw.read(QUARANTINE_SLOT_KEY)).toBeUndefined();
  });

  it("reports storage as unavailable instead of throwing", async () => {
    await expect(openSaveDatabase(undefined)).rejects.toThrow(/not available/);

    const store = createSaveStore({
      backend: {
        read: () => Promise.reject(new Error("storage disabled")),
        commit: () => Promise.reject(new Error("storage disabled")),
        close: () => undefined,
      },
    });
    const result = await store.load();
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "unavailable" });
  });
});
