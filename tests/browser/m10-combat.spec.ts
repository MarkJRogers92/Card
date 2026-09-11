import { expect, test } from "@playwright/test";
import {
  hashM10Fight,
  replayM10Commands,
  type M10Command,
} from "../../src/engine";

async function readCommands(page: import("@playwright/test").Page): Promise<M10Command[]> {
  const raw = await page.getByTestId("command-log").textContent();
  if (raw === null) throw new Error("M10 command log was not rendered.");
  return JSON.parse(raw) as M10Command[];
}

test("wins a Claims Adjuster fight through UI controls and matches headless replay", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("enemy-target").click();
  await expect(page.getByTestId("outcome")).toHaveText("active");
  await expect(page.getByTestId("enemy-intent")).toContainText("Stamp");

  for (let step = 0; step < 40; step += 1) {
    const outcome = await page.getByTestId("outcome").textContent();
    if (outcome === "victory") break;

    const damageCards = page.locator(
      'button.play-card[data-card-damage="true"]:not([disabled])',
    );
    if ((await damageCards.count()) > 0) {
      await damageCards.first().click();
    } else {
      await page.getByTestId("end-turn").click();
    }
  }

  await expect(page.getByTestId("outcome")).toHaveText("victory");
  await expect(page.getByTestId("enemy-hp")).toContainText("0/30 HP");

  const commands = await readCommands(page);
  expect(commands.length).toBeGreaterThan(0);
  const headless = replayM10Commands(commands);
  expect(headless.combat?.outcome).toBe("victory");

  const browserHash = await page.getByTestId("state-hash").textContent();
  expect(browserHash).toBe(hashM10Fight(headless));
});

test("restart restores the deterministic opening state and clears the UI command log", async ({
  page,
}) => {
  await page.goto("/");
  const initialHash = await page.getByTestId("state-hash").textContent();

  const playableCard = page.locator("button.play-card:not([disabled])").first();
  await playableCard.click();
  expect((await readCommands(page)).length).toBe(1);

  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByTestId("turn-number")).toHaveText("Turn 1");
  await expect(page.getByTestId("energy")).toHaveText("3");
  await expect(page.getByTestId("enemy-hp")).toContainText("30/30 HP");
  await expect(page.getByTestId("outcome")).toHaveText("active");
  expect(await readCommands(page)).toStrictEqual([]);
  await expect(page.getByTestId("state-hash")).toHaveText(initialHash ?? "");
});

test("claims the deterministic M18 reward and shows its Scrap", async ({ page }) => {
  await page.goto("/?fixture=m18");

  await expect(page.getByTestId("reward-panel")).toBeVisible();
  await page.getByTestId("reward-option-source.open_wound").click();
  await expect(page.getByTestId("scrap")).toHaveText("15");
  await expect(page.getByTestId("reward-panel")).toHaveCount(0);
});

test("runs the M19 test act from the first node through rest to the next combat", async ({
  page,
}) => {
  await page.goto("/?fixture=m19");

  await expect(page.getByTestId("run-node")).toContainText("ordinary_1");
  await expect(page.getByTestId("run-completed")).toContainText("0/7");
  await page.getByTestId("run-begin-node").click();
  await expect(page.getByTestId("outcome")).toHaveText("active");

  for (let step = 0; step < 200; step += 1) {
    if ((await page.getByTestId("outcome").textContent()) === "victory") break;
    const damageCards = page.locator(
      'button.play-card[data-card-damage="true"]:not([disabled])',
    );
    if ((await damageCards.count()) > 0) {
      await damageCards.first().click();
    } else {
      await page.getByTestId("end-turn").click();
    }
  }

  await expect(page.getByTestId("outcome")).toHaveText("victory");
  await page.getByTestId("run-resolve-combat").click();
  await expect(page.getByTestId("reward-panel")).toBeVisible();
  await page.locator(".reward-option").first().click();
  await expect(page.getByTestId("reward-panel")).toHaveCount(0);
  await expect(page.getByTestId("run-scrap")).toHaveText("15");

  await page.getByTestId("run-advance").click();
  await expect(page.getByTestId("run-node")).toContainText("rest_1");

  const hpBeforeRest = Number.parseInt(
    (await page.getByTestId("run-morrow-hp").textContent()) ?? "0",
    10,
  );
  await page.getByTestId("run-rest-morrow").click();
  const hpAfterRest = Number.parseInt(
    (await page.getByTestId("run-morrow-hp").textContent()) ?? "0",
    10,
  );
  expect(hpAfterRest).toBe(Math.min(hpBeforeRest + 18, 44));
  await expect(page.getByTestId("run-completed")).toContainText("2/7");

  await page.getByTestId("run-advance").click();
  await expect(page.getByTestId("run-node")).toContainText("ordinary_2");
  await page.getByTestId("run-begin-node").click();
  await expect(page.getByTestId("outcome")).toHaveText("active");
  await expect(page.getByTestId("energy")).toHaveText("3");
});
