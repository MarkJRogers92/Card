import { expect, test } from "@playwright/test";

test("persists a run across a reload and recovers it from a backup", async ({ page }) => {
  await page.goto("/?fixture=m21");
  await expect(page.getByTestId("store-status")).toHaveText("empty");

  await page.getByTestId("run-begin-node").click();
  await expect(page.getByTestId("turn-number")).toHaveText("1");
  await page.getByTestId("end-turn").click();
  const hash = await page.getByTestId("state-hash").textContent();

  await page.getByTestId("store-commit").click();
  await expect(page.getByTestId("store-status")).toHaveText("committed: generation 1");
  await expect(page.getByTestId("store-generation")).toHaveText("generation 1");

  await page.reload();
  await expect(page.getByTestId("store-status")).toHaveText("loaded: active generation 1");
  await expect(page.getByTestId("state-hash")).toHaveText(hash ?? "");

  await page.getByTestId("store-commit").click();
  await expect(page.getByTestId("store-status")).toHaveText("committed: generation 2");

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("joint-liability", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("saves", "readwrite");
      transaction
        .objectStore("saves")
        .put({ key: "active", generation: 2, text: "{}", profile: null });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.getByTestId("store-load").click();
  await expect(page.getByTestId("store-status")).toHaveText(
    "loaded: backup.1 generation 1 (repaired)",
  );
  await expect(page.getByTestId("store-generation")).toHaveText("generation 1");

  await page.getByTestId("store-commit").click();
  await expect(page.getByTestId("store-status")).toHaveText("committed: generation 2");
});
