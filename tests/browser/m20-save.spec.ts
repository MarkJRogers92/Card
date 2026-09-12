import { expect, test } from "@playwright/test";

function tamperChecksum(text: string): string {
  return text.replace(/"checksum":"([^"]+)"/, (_match, value: string) => {
    const flipped = value.endsWith("0") ? "1" : "0";
    return `"checksum":"${value.slice(0, -1)}${flipped}"`;
  });
}

test("exports, reimports, and rejects a tampered save in the browser", async ({ page }) => {
  await page.goto("/?fixture=m20");
  await expect(page.getByTestId("run-outcome")).toHaveText("active");

  await page.getByTestId("run-begin-node").click();
  await expect(page.getByTestId("turn-number")).toHaveText("1");
  const originalHash = await page.getByTestId("state-hash").textContent();

  await page.getByTestId("save-export").click();
  await expect(page.getByTestId("save-status")).toHaveText("exported");
  const exported = await page.getByTestId("save-text").inputValue();
  expect(exported).toContain('"saveVersion":1');
  expect(exported).toContain('"checksum":"fnv1a64-utf8-v1:');

  await page.getByRole("button", { name: "Restart act" }).click();
  await expect(page.getByTestId("state-hash")).not.toHaveText(originalHash ?? "");

  await page.getByTestId("save-import").click();
  await expect(page.getByTestId("save-status")).toHaveText("loaded: v1");
  await expect(page.getByTestId("state-hash")).toHaveText(originalHash ?? "");

  const tampered = tamperChecksum(exported);
  expect(tampered).not.toBe(exported);
  await page.getByTestId("save-text").fill(tampered);
  await page.getByTestId("save-import").click();

  await expect(page.getByTestId("save-status")).toHaveText("rejected: checksum_mismatch");
  await expect(page.getByTestId("save-text")).toHaveValue(tampered);
  await expect(page.getByTestId("state-hash")).toHaveText(originalHash ?? "");
});
