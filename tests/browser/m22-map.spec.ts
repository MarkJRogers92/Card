import { expect, test } from "@playwright/test";

const ACT_1_ENTRANCE = "map-node-act-1-row-1-col-0";
const ACT_1_SERVICE = "map-node-act-1-row-3-col-0";
const ACT_2_ENTRANCE = "map-node-act-2-row-1-col-0";

test("renders the M22 map, locks Act 2, and begins the chosen Act 1 node", async ({
  page,
}) => {
  await page.goto("/?fixture=m22");

  const act1 = page.getByTestId("map-act-1");
  const act2 = page.getByTestId("map-act-2");

  // Act 1 is the playable map: seven rows, fourteen persisted nodes.
  await expect(act1).toBeVisible();
  await expect(act1.getByTestId(/^map-node-act-1-/)).toHaveCount(14);

  // Act 2 is visible but explicitly reserved.
  await expect(act2).toBeVisible();
  await expect(act2).toContainText("Reserved");
  await expect(act2.getByTestId(/^map-node-act-2-/)).toHaveCount(14);
  await expect(page.getByTestId(ACT_2_ENTRANCE)).toBeDisabled();

  // Unsupported service nodes never become selectable.
  await expect(page.getByTestId(ACT_1_SERVICE)).toBeDisabled();
  await expect(page.getByTestId(ACT_1_SERVICE)).toHaveAttribute(
    "data-state",
    "unavailable",
  );

  // The entrance can be chosen, but Begin waits for that legal selection.
  await expect(page.getByTestId(ACT_1_ENTRANCE)).toBeEnabled();
  await expect(page.getByTestId(ACT_1_ENTRANCE)).toHaveAttribute(
    "data-state",
    "current",
  );
  await expect(page.getByTestId("run-begin-node")).toBeDisabled();

  await page.getByTestId(ACT_1_ENTRANCE).click();
  await expect(page.getByTestId("run-begin-node")).toBeEnabled();
});
