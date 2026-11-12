import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.TAROT_TEST_URL || "http://127.0.0.1:4173/";
const executablePath =
  process.env.TAROT_CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath });

async function openFan(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  await page.goto(`${base}#/lab`);
  await page
    .getByRole("textbox", { name: "一个清楚、开放、与你有关的问题" })
    .fill("未来一周，我可以怎样建立稳定的学习习惯？");
  await page.getByRole("button", { name: "洗牌，开始观察" }).click();
  await expect(page.locator(".fan-card")).toHaveCount(78);
  return page;
}

function readDraft(page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("tarot-academy:v1")).readingDraft,
  );
}

try {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await openFan(context);
    const fan = page.locator(".fan-viewport");
    const buttons = page.locator(".fan-card");
    const middleButton = buttons.nth(38);
    const middleVisual = page.locator(".fan-visual").nth(38);

    await expect
      .poll(
        () =>
          fan.evaluate((element) => {
            const mat = element.getBoundingClientRect();
            const visuals = [...element.querySelectorAll(".fan-visual")].map(
              (card) => card.getBoundingClientRect(),
            );
            const misses = [...element.querySelectorAll(".fan-card")].flatMap(
              (card, i) => {
                const { x, y, width, height } = card.getBoundingClientRect();
                const hit = document.elementFromPoint(
                  x + width / 2,
                  y + height / 2,
                );
                return hit === card ? [] : [i + 1];
              },
            );
            return {
              fullFanInView:
                visuals.length === 78 &&
                visuals.every(
                  ({ left, right, top, bottom }) =>
                    left >= Math.max(mat.left, 0) &&
                    right <= Math.min(mat.right, innerWidth) &&
                    top >= Math.max(mat.top, 0) &&
                    bottom <= Math.min(mat.bottom, innerHeight),
                ),
              horizontalOverflow: element.scrollWidth - element.clientWidth,
              arc: visuals[0].top - visuals[38].top > 80,
              misses,
            };
          }),
        {
          message: `78 clickable cards at ${viewport.width}x${viewport.height}`,
        },
      )
      .toEqual({
        fullFanInView: true,
        horizontalOverflow: 0,
        arc: true,
        misses: [],
      });

    const hitBox = await middleButton.boundingBox();
    const normalY = (await middleVisual.boundingBox()).y;
    await page.mouse.move(
      hitBox.x + hitBox.width / 2,
      hitBox.y + hitBox.height / 2,
    );
    await expect
      .poll(async () => (await middleVisual.boundingBox()).y)
      .toBeLessThan(normalY - 15);
    assert.deepEqual(
      await middleButton.boundingBox(),
      hitBox,
      "Hover keeps the hitbox stationary",
    );
    assert.ok(
      await middleButton.evaluate((button) => button.matches(":hover")),
    );
    if (viewport.width === 1366)
      await page.screenshot({ path: "docs/studio-fan-desktop.png" });

    await buttons.first().click();
    await buttons.nth(3).focus();
    await page.keyboard.press("Home");
    await expect(buttons.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(buttons.last()).toBeFocused();
    await page.keyboard.press("Enter");
    await middleButton.click();
    await page.getByRole("button", { name: /翻开第1张牌/ }).click();
    const draft = await readDraft(page);
    assert.deepEqual(draft.selectedIndices, [0, 77, 38]);
    assert.equal(new Set(draft.cards.map((card) => card.cardId)).size, 3);
    assert.deepEqual(draft.flipped, [draft.cards[0].cardId]);
    await context.close();
    console.log(
      `PASS: fan geometry and selection at ${viewport.width}x${viewport.height}.`,
    );
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await openFan(context);
  const cdp = await context.newCDPSession(page);
  const fan = page.locator(".fan-viewport");
  await fan.scrollIntoViewIfNeeded();
  const box = await fan.boundingBox();
  const start = Math.round(box.x + box.width - 30);
  const y = Math.round(box.y + 70);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start, y }],
  });
  for (let distance = 20; distance <= 200; distance += 20) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start - distance, y }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => fan.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(50);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
    0,
  );
  const cards = page.locator(".fan-card");
  const index = await cards.evaluateAll((buttons) =>
    buttons.findIndex((button) => {
      const { x, y, width, height } = button.getBoundingClientRect();
      return (
        document.elementFromPoint(x + width / 2, y + height / 2) === button
      );
    }),
  );
  assert.ok(index >= 0, "A card remains touchable after the swipe");
  await cards.nth(index).tap();
  await expect(cards.nth(index)).toHaveAttribute("aria-pressed", "true");
  console.log("PASS: mobile swipe and tap at 390x844.");
} finally {
  await browser.close();
}
