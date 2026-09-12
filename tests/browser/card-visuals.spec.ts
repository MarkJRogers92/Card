import { expect, test } from "@playwright/test";
import { createM10Fight, getM10Hand } from "../../src/engine";

const openingHand = getM10Hand(createM10Fight());
const firstCard = openingHand[0];
if (firstCard === undefined) {
  throw new Error("Expected the opening hand to contain at least one card.");
}

test("hand cards expose a reusable visual-art surface without changing play controls", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId(`card-${firstCard.instanceId}`);

  await expect(card).toHaveAttribute("data-card-definition", firstCard.definitionId);
  await expect(card.locator(".card-art")).toBeVisible();
  await expect(card.locator(".card-art-mark")).toBeVisible();
  await expect(card.locator(".card-effect")).toHaveText(firstCard.explanation.summary);
});
