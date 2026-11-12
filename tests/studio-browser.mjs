import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { emptyState, blankCard } from "../src/lib/learning.ts";
const base = process.env.TAROT_TEST_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.TAROT_CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  reducedMotion: "reduce",
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
});
const legacy = emptyState();
legacy.cards["major-0"] = {
  ...blankCard(),
  note: "升级前已有的私人牌义笔记",
  favorite: true,
  status: "familiar",
};
legacy.lessons["what-is-tarot"] = {
  response: "旧课程回答仍然保存",
  completedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
await context.addInitScript((s) => {
  if (!localStorage.getItem("tarot-academy:v1"))
    localStorage.setItem("tarot-academy:v1", JSON.stringify(s));
}, legacy);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const go = async (route) => {
  await page.goto(base + "#" + route);
  await page.locator("main").waitFor();
};
const home = async () => {
  await go("/");
  await page.locator(".studio-home.is-ready").waitFor();
};
const overflow = async (label) =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    label,
  );
const checkTabletopEdge = async () => {
  const gap = await page.locator(".studio-table-art").evaluate((table) => {
    const { top, height } = table.getBoundingClientRect();
    return innerHeight - (top + height * 0.54);
  });
  assert(
    gap >= 3 && gap <= 24,
    `Tabletop front edge has a ${gap}px bottom gap`,
  );
};
const checkRoomArtwork = async (filename) => {
  await expect
    .poll(() =>
      page
        .locator(".studio-interior")
        .evaluate((room) =>
          room.complete && room.naturalWidth > 0
            ? new URL(room.currentSrc).pathname
            : "",
        ),
    )
    .toBe(`/studio/${filename}`);
};
await mkdir("docs", { recursive: true });
try {
  await home();
  const mainMenu = page.getByRole("navigation", { name: "书房主菜单" });
  await expect(mainMenu.getByRole("button")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "我的塔罗书房" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(1);
  await expect(
    page.getByRole("complementary", { name: "每日一句" }),
  ).toBeVisible();
  await checkTabletopEdge();
  await checkRoomArtwork("room-open-floor.webp");
  await expect(page.locator(".studio-welcome")).toHaveCount(0);
  for (const label of await page.locator(".scene-object-label").all()) {
    await expect(label).toBeInViewport();
    await expect(label).toHaveCSS("opacity", "1");
    await expect(label).toHaveCSS("backdrop-filter", "blur(8px)");
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "切换自然环境" }).click();
  await expect(page.locator(".studio-panel-environment")).toBeVisible();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "切换为浅色模式" }).click();
  const before = await page.locator(".object-cards").boundingBox();
  for (const label of ["海边书房", "山湖书房", "雨天书房", "森林书房"]) {
    await page
      .getByRole("button", { name: "切换自然环境", exact: true })
      .click();
    await page
      .locator(".studio-panel-environment")
      .getByRole("button", { name: new RegExp(label) })
      .click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    const after = await page.locator(".object-cards").boundingBox();
    for (const k of ["x", "y", "width", "height"])
      assert(
        Math.abs(before[k] - after[k]) < 0.1,
        "object moved across environment " + k,
      );
  }
  await page.reload();
  assert.equal(
    await page
      .locator(".studio-home")
      .getAttribute("class")
      .then((s) => s.includes("env-forest")),
    true,
  );
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "docs/studio-illustrated-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "声音设置", exact: true }).click();
  await expect(page.getByRole("button", { name: /开启声音/ })).toBeVisible();
  await page.getByRole("button", { name: /开启声音/ }).click();
  await expect(page.getByRole("button", { name: /暂停声音/ })).toBeVisible();
  await page.getByRole("slider", { name: "书房音量" }).fill("0.2");
  await page
    .getByRole("checkbox", { name: "自然环境音", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await mainMenu.getByText("塔罗学院", { exact: true }).click();
  await expect(page).toHaveURL(/#\/courses/);
  await expect(
    page.getByRole("link", { name: "返回书房", exact: true }),
  ).toHaveCount(1);
  const academy = page.getByRole("navigation", { name: "塔罗学院" });
  await expect(academy.getByRole("link")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "学习进度", exact: true }),
  ).toHaveCount(0);
  for (const [label, destination] of [
    ["33 节微课程", /#\/courses\/lessons/],
    ["78 张牌库", /#\/cards/],
    ["提问练习", /#\/questions/],
  ]) {
    await academy.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(destination);
    const back = page.getByRole("link", { name: "返回塔罗学院", exact: true });
    await expect(back).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "返回书房", exact: true }),
    ).toHaveCount(0);
    await back.click();
    await expect(academy).toBeVisible();
  }
  await page.getByRole("button", { name: "声音设置", exact: true }).click();
  await expect(page.getByRole("button", { name: /暂停声音/ })).toBeVisible();
  await page.getByRole("button", { name: "关闭声音设置" }).click();
  await home();
  await page.reload();
  await page.getByRole("button", { name: "声音设置", exact: true }).click();
  await expect(page.getByRole("button", { name: /开启声音/ })).toBeVisible();
  await expect(page.getByRole("slider", { name: "书房音量" })).toHaveValue(
    "0.2",
  );
  await expect(
    page.getByRole("checkbox", { name: "自然环境音", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  for (const [label, url] of [
    ["每日日记", "/daily"],
    ["记忆训练", "/training"],
  ]) {
    await home();
    await mainMenu.getByText(label, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp("#" + url));
  }
  await home();
  await mainMenu.getByText("抽牌", { exact: true }).click();
  await expect(page).toHaveURL(/#\/lab\?daily=1/);
  await page.getByRole("button", { name: "洗牌，开始观察" }).click();
  await expect(page.locator(".fan-card")).toHaveCount(78);
  await page.locator(".fan-card").nth(39).click();
  await page.getByRole("button", { name: /翻开第1张牌/ }).click();
  await page
    .getByRole("textbox", { name: "我的独立解读" })
    .fill("我先观察牌面，再结合今天的生活，把感受与事实分开记录。");
  await page.getByRole("button", { name: "保存为今日晨间卡牌" }).click();
  await expect(
    page.locator(".morning-reading-save").getByRole("status"),
  ).toContainText(/晨间|已有/);
  const draft = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tarot-academy:v1")).readingDraft,
  );
  await go("/daily");
  await expect(page.locator(".daily-morning-layout")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "我的初步解读" })).toHaveValue(
    /我先观察牌面/,
  );
  await page.screenshot({
    path: "docs/studio-polish-diary.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的初步解读" })).toHaveValue(
    /我先观察牌面/,
  );
  await home();
  await page.getByRole("button", { name: "切换为深色模式" }).click();
  await page.waitForTimeout(1100);
  await page.screenshot({
    path: "docs/studio-illustrated-night.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/lab",
    "/daily",
    "/daily/history",
    "/reflection",
    "/mentor",
    "/settings",
    "/courses",
    "/cards",
    "/progress",
  ]) {
    await go(route);
    await overflow("mobile " + route);
    await page.getByRole("button", { name: "切换为浅色模式" }).click();
    await overflow("mobile light " + route);
    await page.getByRole("button", { name: "切换为深色模式" }).click();
  }
  await home();
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "docs/studio-illustrated-mobile.png",
    fullPage: true,
  });
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tarot-academy:v1")),
  );
  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await home();
    await checkTabletopEdge();
    await checkRoomArtwork("room-mobile-open.webp");
    for (const [label, route] of [
      ["抽牌", "/lab"],
      ["塔罗学院", "/courses"],
      ["记忆训练", "/training"],
      ["每日日记", "/daily"],
    ]) {
      await home();
      const entry = mainMenu.getByText(label, { exact: true });
      await expect(entry).toBeInViewport({ ratio: 1 });
      await entry.click();
      await expect(page).toHaveURL(new RegExp("#" + route));
      await page.getByRole("link", { name: /返回(我的)?书房/ }).click();
    }
  }
  assert.equal(state.cards["major-0"].note, legacy.cards["major-0"].note);
  assert.equal(
    state.lessons["what-is-tarot"].response,
    legacy.lessons["what-is-tarot"].response,
  );
  assert.equal(state.readingDraft.cards[0].cardId, draft.cards[0].cardId);
  assert.deepEqual(errors, []);
  const animated = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    reducedMotion: "no-preference",
  });
  const ap = await animated.newPage();
  await ap.goto(base);
  await ap.locator(".studio-home.is-ready").waitFor();
  await ap.getByRole("button", { name: "塔罗学院", exact: true }).click();
  await expect(ap.locator(".room-transition")).toBeVisible();
  await ap.getByRole("button", { name: "跳过转场", exact: true }).click();
  await expect(ap).toHaveURL(/#\/courses/);
  await animated.close();
  const dailyQuote = await context.newPage();
  await dailyQuote.clock.setFixedTime(new Date("2026-11-12T04:00:00Z"));
  await dailyQuote.goto(base);
  const quote = dailyQuote.locator(".studio-daily-reflection p");
  await expect(quote).not.toBeEmpty();
  const firstQuote = await quote.innerText();
  await dailyQuote.reload();
  await expect(quote).toHaveText(firstQuote);
  await dailyQuote.clock.setFixedTime(new Date("2026-11-13T04:00:00Z"));
  await dailyQuote.reload();
  await expect(quote).not.toHaveText(firstQuote);
  await dailyQuote.close();
  await writeFile(
    "docs/studio-verification.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        result: "PASS",
        browser: await browser.version(),
        desktop: "1440x960",
        mobile: "390x844",
        checks: [
          "fixed object geometry across4environments",
          "environment preference persisted",
          "real audio opt-in / volume / independent toggles / cross-route continuity / reload silent",
          "single room menu and four always visible labels, desktop and 390/320px",
          "tabletop front edge near viewport bottom, 320x568 entry clicks and daily reflection by local date",
          "mobile loads frameless room artwork while desktop uses the framed room",
          "manual shuffled78card selection to morning diary",
          "morning interpretation persists across reload",
          "legacy notes / courses preserved",
          "10 routes dark/light mobile nooverflow",
          "skip animation and actual camera transition",
          "no runtimeerrors",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: Studio layers, objects, environments, sound, reading-to-diary, legacy preservation, motion and mobile.",
  );
} finally {
  await browser.close();
}
