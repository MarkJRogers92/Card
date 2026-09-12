import { expect, test } from "@playwright/test";

/**
 * Runtime verification for the Morrow character asset.
 *
 * Loads the approved sprite sheet through the real PixiJS runtime and checks the things that
 * isolated PNG inspection cannot: that the manifest resolves, the texture survives the asset
 * pipeline, nearest-neighbour scaling is preserved, the anchor puts the feet on the ground line,
 * and the animation actually advances without console errors.
 */
test("loads the Morrow sprite sheet through PixiJS and animates it", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/?preview=morrow");

  await expect(page.getByTestId("morrow-preview-status")).toHaveText(/^playing morrow walk$/);
  const canvas = page.getByTestId("morrow-canvas").locator("canvas");
  await expect(canvas).toBeVisible();

  const probe = await page.evaluate(() => window.__morrowPreview ?? null);
  if (probe === null) throw new Error("The Morrow preview did not publish its runtime probe.");

  expect(probe.ready).toBe(true);
  expect(probe.character).toBe("morrow");
  expect(probe.animations).toEqual(["walk"]);
  expect(probe.frameCount).toBe(4);
  expect(probe.frameWidth).toBe(256);
  expect(probe.frameHeight).toBe(256);
  expect(probe.anchor.x).toBeCloseTo(0.5, 5);
  expect(probe.anchor.y).toBeCloseTo(0.8125, 5);
  expect(probe.scaleMode).toBe("nearest");

  // getBounds() covers the whole 256px cell, including transparent padding, so the meaningful
  // check is where the character's actual feet row lands. GROUND_ROW_PX comes from the asset QA
  // report: the lowest painted row inside the 256 cell is y=208.
  const GROUND_ROW_PX = 208;
  const HEAD_ROW_PX = 24;
  const frameTop = probe.spriteBounds.y;
  const frameLeft = probe.spriteBounds.x;
  expect(frameLeft + probe.frameWidth / 2).toBeCloseTo(probe.stageSize / 2, 1);
  expect(Math.abs(frameTop + GROUND_ROW_PX - probe.groundY)).toBeLessThanOrEqual(0.5);
  expect(frameTop + HEAD_ROW_PX).toBeGreaterThanOrEqual(0);
  expect(frameTop + probe.frameHeight).toBeLessThanOrEqual(probe.stageSize);
  expect(probe.spriteBounds.width).toBe(probe.frameWidth);

  // A looping walk must actually advance through its frames. Poll rather than sampling a fixed
  // number of times so a slow first ticker frame cannot make this look like a stall.
  const seen = new Set<number>();
  for (let sample = 0; sample < 80 && seen.size < 2; sample += 1) {
    seen.add(await page.evaluate(() => window.__morrowPreview?.currentFrame() ?? -1));
    await page.waitForTimeout(50);
  }
  expect(seen.size).toBeGreaterThan(1);
  expect(Math.max(...seen)).toBeLessThan(4);

  // Ground contact is measured per frame from the sheet exactly as the browser decodes it, so a
  // floating pose cannot hide behind the sprite-level anchor or the stage position.
  const groundRows = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/assets/characters/morrow/morrow_walk.png";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("A 2D context is required to measure the sheet.");
    const rows: number[] = [];
    for (let frame = 0; frame < 4; frame += 1) {
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(image, frame * 256, 0, 256, 256, 0, 0, 256, 256);
      const data = ctx.getImageData(0, 0, 256, 256).data;
      let bottom = -1;
      for (let y = 0; y < 256; y += 1) {
        for (let x = 0; x < 256; x += 1) {
          if (data[(y * 256 + x) * 4 + 3] > 8) bottom = y;
        }
      }
      rows.push(bottom);
    }
    return rows;
  });
  expect(groundRows).toEqual([207, 207, 207, 207]);

  expect(consoleErrors).toEqual([]);
});
