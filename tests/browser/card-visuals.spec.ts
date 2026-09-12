import { expect, test } from "@playwright/test";
import { createM10Fight, getM10Hand } from "../../src/engine";

const openingHand = getM10Hand(createM10Fight());
const firstCard = openingHand[0];
if (firstCard === undefined) {
  throw new Error("Expected the opening hand to contain at least one card.");
}

test("hand cards expose a reusable visual-art surface without changing rules text", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId(`card-${firstCard.instanceId}`);
  await expect(card).toBeVisible();

  const artSurface = await card.evaluate((element) => {
    const style = window.getComputedStyle(element, "::before");
    return {
      content: style.content,
      height: Number.parseFloat(style.height),
      backgroundImage: style.backgroundImage,
    };
  });

  expect(artSurface.content).not.toBe("none");
  expect(artSurface.height).toBeGreaterThan(40);
  expect(artSurface.backgroundImage).not.toBe("none");
  await expect(card.locator(".card-effect")).toHaveText(firstCard.explanation.summary);
});
