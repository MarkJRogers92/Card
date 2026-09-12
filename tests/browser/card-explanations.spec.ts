import { expect, test } from "@playwright/test";
import { createM10Fight, getM10Hand } from "../../src/engine";

const openingHand = getM10Hand(createM10Fight());
const firstCard = openingHand[0];
if (firstCard === undefined) {
  throw new Error("Expected the opening hand to contain at least one card.");
}

const cardTestId = `card-${firstCard.instanceId}`;

test("hovering a hand card explains what it does", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId(cardTestId);
  await expect(card).toBeVisible();
  await expect(page.getByTestId("card-tooltip")).toBeHidden();

  await card.hover();

  const tooltip = page.getByTestId("card-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(firstCard.name);
  await expect(tooltip).toContainText(firstCard.explanation.summary);
  for (const line of firstCard.explanation.lines) {
    await expect(tooltip).toContainText(line.text);
  }
  await expect(page.getByTestId(`card-effect-${firstCard.instanceId}`)).toHaveText(
    firstCard.explanation.summary,
  );
});

test("keyboard focus reveals the same explanation and describes the card", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByTestId(cardTestId);

  await card.focus();

  const tooltip = page.getByTestId("card-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(firstCard.explanation.summary);

  const describedBy = await card.getAttribute("aria-describedby");
  expect(describedBy).toBe(`card-detail-${firstCard.instanceId}`);
  await expect(page.getByTestId(`card-detail-${firstCard.instanceId}`)).toContainText(
    firstCard.explanation.summary,
  );
});

test("clicking a card still plays it while the explanation is available", async ({
  page,
}) => {
  await page.goto("/");
  const damageCard = page.locator('button.play-card[data-card-damage="true"]:not([disabled])');
  await expect(damageCard.first()).toBeVisible();

  await damageCard.first().click();

  const rawLog = await page.getByTestId("command-log").textContent();
  const commands = JSON.parse(rawLog ?? "[]") as Array<{ kind: string }>;
  expect(commands).toHaveLength(1);
  expect(commands[0]?.kind).toBe("play_card");
});
