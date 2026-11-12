import assert from "node:assert/strict";
import type { DailyEntry } from "../src/lib/daily.ts";
import {
  newDaily,
  retainPredictionHistory,
  validateDaily,
  validateDailyEntries,
  diaryCsv,
  diaryText,
  parseStudioBackup,
  studioBackup,
} from "../src/lib/daily.ts";
import { emptyState } from "../src/lib/learning.ts";
const one = newDaily("2026-11-11");
assert.equal(one.id, "daily-2026-11-11");
assert.equal(one.tarot.congruence, "skip");
assert.throws(() => newDaily("2026-02-30"));
one.morning.drawn = {
  cardId: "major-0",
  position: "每日观察",
  reversed: false,
};
one.morning.prediction = "我预期今天会想尝试新的学习方式";
const first = retainPredictionHistory(one, null, "2026-11-11T07:00:00.000Z");
assert.equal(first.predictionVersions.length, 1);
const edited = structuredClone(first);
edited.morning.prediction = "晚间修改后的联想";
edited.predictionVersions = [];
const second = retainPredictionHistory(
  edited,
  first,
  "2026-11-11T19:00:00.000Z",
);
assert.equal(second.predictionVersions.length, 2);
assert.equal(second.predictionVersions[0].prediction, one.morning.prediction);
assert.equal(second.predictionVersions[1].prediction, "晚间修改后的联想");
const cleared = structuredClone(second);
cleared.morning.prediction = "";
const third = retainPredictionHistory(
  cleared,
  second,
  "2026-11-11T20:00:00.000Z",
);
assert.equal(third.predictionVersions.length, 3);
assert.equal(third.predictionVersions[0].prediction, one.morning.prediction);
assert.equal(
  retainPredictionHistory(third, third).predictionVersions.length,
  3,
);
assert.equal(validateDaily(third).predictionVersions.length, 3);
assert.throws(() => validateDaily({ ...third, id: "different-id" }));
assert.throws(() =>
  validateDaily({
    ...third,
    morning: {
      ...third.morning,
      drawn: { cardId: "unknown", reversed: false, position: "x" },
    },
  }),
);
assert.throws(() =>
  validateDaily({
    ...third,
    photos: [
      { id: "x", caption: "x", dataUrl: "data:image/svg+xml;base64,abcd" },
    ],
  }),
);
assert.throws(() => validateDailyEntries([third, third]));
const learning = emptyState();
learning.lessons["a-future-lesson"] = {
  response: "保留我的课程记录",
  completedAt: null,
  updatedAt: "2026-11-11T00:00:00Z",
};
const backup = studioBackup(learning, [third]);
const restored = parseStudioBackup(JSON.parse(JSON.stringify(backup)));
assert.equal(restored.entries?.[0].predictionVersions.length, 3);
assert.equal(
  restored.learning.lessons["a-future-lesson"].response,
  "保留我的课程记录",
);
assert.equal(
  parseStudioBackup({ data: learning }).entries,
  null,
  "legacy learning backup leaves daily entries alone",
);
assert.throws(() =>
  parseStudioBackup({ ...backup, studio: { entries: [{ broken: true }] } }),
);
third.evening.events = '=HYPERLINK("bad")';
third.evening.feelings = '平静,"一段记录"';
const csv = diaryCsv([third]);
assert(csv.startsWith("\uFEFF"));
assert(csv.includes("'=HYPERLINK"));
assert(csv.includes('""一段记录""'));
assert(diaryText(third).includes("晚间修改后的联想"));
assert(diaryText(third).includes("不评价"));
assert(diaryText(third).includes("愚者"));
console.log(
  "PASS: daily validation, immutable prediction history, optional non-fit, full/legacy backup parsing, CSV quoting and formula safety.",
);

if (process.env.STUDIO_BROWSER_URL) {
  const { chromium, expect } = await import("@playwright/test");
  const { readFile } = await import("node:fs/promises");
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.TAROT_CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const base = process.env.STUDIO_BROWSER_URL.replace(/\/$/, "");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  try {
    await page.route("**/__daily_qa", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<div>Diary storage QA</div>",
      }),
    );
    await page.goto(`${base}/__daily_qa`);
    await page.evaluate(async () => {
      const moduleUrl = "/src/lib/daily.ts";
      const d = await import(moduleUrl);
      let e = d.newDaily("2026-11-10");
      e.morning.prediction = "原始事前想法";
      e = await d.saveDaily(e);
      e.morning.prediction = "晚间修改";
      e.predictionVersions = [];
      e = await d.saveDaily(e);
      if (
        e.predictionVersions.length !== 2 ||
        e.predictionVersions[0].prediction !== "原始事前想法"
      )
        throw Error("prediction preservation");
      const beforeMorning = await d.getDaily("2026-11-10");
      const first = await d.saveMorningReading({
        date: "2026-11-10",
        question: "今天留意什么",
        drawn: { cardId: "major-0", reversed: false, position: "每日观察" },
        interpretation: "先看画面再联系生活",
        reference: "参考快照",
      });
      const again = await d.saveMorningReading({
        date: "2026-11-10",
        question: "新问题",
        drawn: { cardId: "major-21", reversed: true, position: "每日观察" },
        interpretation: "不应覆盖",
        reference: "不可覆盖",
      });
      const got = await d.getDaily("2026-11-10");
      if (
        !first.created ||
        again.created ||
        got.morning.drawn.cardId !== "major-0" ||
        got.morning.interpretation === "不应覆盖"
      )
        throw Error("morning overwrite guard");
      try {
        beforeMorning.evening.events = "另一个标签页的草稿";
        await d.saveDaily(beforeMorning, d.dailyVersion(beforeMorning));
        throw Error("stale diary write accepted");
      } catch (err) {
        if (!(err instanceof d.DailyConflictError)) throw err;
      }
      if ((await d.getDaily("2026-11-10")).morning.drawn.cardId !== "major-0")
        throw Error("stale editor erased the morning reading");
      try {
        await d.replaceDailyEntries([{ broken: true }]);
        throw Error("bad import accepted");
      } catch (err) {
        if ((err as Error).message === "bad import accepted") throw err;
      }
      if ((await d.listDaily()).length !== 1)
        throw Error("invalid import changed records");
    });
    console.log(
      "PASS: native IndexedDB transactions, prediction versions, morning overwrite guard and invalid restore without writes.",
    );
    await page.goto(`${base}/#/daily?date=2026-11-11`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(
      page.getByRole("heading", { name: "每日塔罗生活观察" }),
    ).toBeVisible();
    await page.locator(".daily-manual-card summary").click();
    await page
      .getByRole("combobox", { name: "关联每日卡牌" })
      .selectOption("major-21");
    await page
      .getByRole("textbox", { name: "事前想法或预测（可选）" })
      .fill("早晨我希望练习完整做完一件事");
    await expect(page.locator(".daily-message")).toContainText(
      "草稿已自动保存",
    );
    await page
      .getByRole("textbox", { name: "今天发生了什么？" })
      .fill("下午完成了一幅练习，也有几件没做完的事。");
    await page
      .getByRole("textbox", { name: "今天有哪些情绪和感受？" })
      .fill("既有满足，也允许自己疲惫。");
    await page
      .getByRole("combobox", { name: "日记契合程度" })
      .selectOption("none");
    await page
      .getByRole("textbox", { name: "哪些地方不符合？" })
      .fill("并没有觉得今天与这张牌有什么明确联系。");
    await page.getByLabel("添加日记照片").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a91cAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.locator(".daily-photos img")).toHaveCount(1);
    await page.getByRole("button", { name: "保存这一页" }).click();
    await expect(page.locator(".daily-message")).toContainText("这一页已保存");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("textbox", { name: "今天发生了什么？" }),
    ).toHaveValue(/下午完成/);
    await expect(
      page.getByRole("combobox", { name: "日记契合程度" }),
    ).toHaveValue("none");
    await expect(page.locator(".daily-photos img")).toHaveCount(1);
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "完整书房JSON备份" }).click();
    const download = await event;
    const path = await download.path();
    assert(path);
    const backup = JSON.parse(await readFile(path, "utf8"));
    assert.equal(backup.studio.entries.length, 2);
    assert(
      backup.studio.entries
        .find((e: DailyEntry) => e.date === "2026-11-11")
        .photos[0].dataUrl.startsWith("data:image/jpeg"),
    );
    await page.getByRole("link", { name: "日记历史", exact: true }).click();
    await expect(page.locator(".daily-history-card")).toHaveCount(2);
    await page.getByRole("button", { name: "表格", exact: true }).click();
    await expect(page.locator(".daily-table tbody tr")).toHaveCount(2);
    const csvEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出筛选结果CSV" }).click();
    const csvDownload = await csvEvent;
    const csvPath = await csvDownload.path();
    assert(csvPath);
    assert((await readFile(csvPath, "utf8")).startsWith("\uFEFF"));
    await page.getByRole("button", { name: "日历", exact: true }).click();
    await page.locator(".daily-calendar input[type=month]").fill("2026-11");
    await page.getByRole("button", { name: "2026-11-11，有日记" }).click();
    await page.getByRole("button", { name: "删除这一页" }).click();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "今天发生了什么？" }),
    ).toHaveValue(/下午完成/);
    await page.getByLabel("每日日记日期").fill("2026-11-09");
    await expect(page.getByLabel("每日日记日期")).toHaveValue("2026-11-09");
    await expect(
      page.getByRole("textbox", { name: "今天发生了什么？" }),
    ).toHaveValue("");
    await page
      .getByRole("textbox", { name: "今天发生了什么？" })
      .fill("补写之前的生活，不覆盖另一日。");
    await page.getByRole("link", { name: "日记历史", exact: true }).click();
    await page.getByRole("button", { name: "时间轴", exact: true }).click();
    await expect(page.locator(".daily-history-card")).toHaveCount(3);
    await page.getByLabel("选择书房备份文件").setInputFiles({
      name: "restore.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "确认恢复", exact: true }).click();
    await expect(page.locator(".daily-message")).toContainText("备份已恢复");
    await expect(page.locator(".daily-history-card")).toHaveCount(2);
    await page.goto(`${base}/#/daily?date=2026-11-11`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("textbox", { name: "今天发生了什么？" }),
    ).toHaveValue(/下午完成/);
    await page.evaluate(() => {
      const setTimer = window.setTimeout.bind(window);
      Reflect.set(
        window,
        "setTimeout",
        (fn: TimerHandler, delay?: number, ...args: unknown[]) =>
          setTimer(fn, delay === 500 ? 10000 : delay, ...args),
      );
    });
    const beforeLegacyImport = "旧版备份导入前刚写下、尚未自动保存的日记。";
    await page
      .getByRole("textbox", { name: "今天发生了什么？" })
      .fill(beforeLegacyImport);
    await page.getByLabel("选择书房备份文件").setInputFiles({
      name: "legacy.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ data: backup.data })),
    });
    await page.getByRole("button", { name: "确认恢复", exact: true }).click();
    await expect(page.locator(".daily-message")).toContainText(
      "旧版学习记录已恢复",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("textbox", { name: "今天发生了什么？" }),
    ).toHaveValue(beforeLegacyImport);
    const otherTab = await context.newPage();
    await otherTab.goto(`${base}/#/daily?date=2026-11-11`);
    const otherEvents = otherTab.getByRole("textbox", {
      name: "今天发生了什么？",
    });
    await expect(otherEvents).toHaveValue(beforeLegacyImport);
    await otherEvents.fill("另一个标签页刚保存的晚间记录。");
    await otherTab.getByRole("button", { name: "保存这一页" }).click();
    await expect(otherTab.locator(".daily-message")).toContainText(
      "这一页已保存",
    );
    await otherTab.close();
    const staleEvents = page.getByRole("textbox", { name: "今天发生了什么？" });
    await staleEvents.fill("当前标签页尚未保存的草稿。");
    await expect(
      page.getByRole("button", { name: "导出当前草稿（含照片）" }),
    ).toBeVisible();
    await expect(staleEvents).toHaveValue("当前标签页尚未保存的草稿。");
    const draftEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出当前草稿（含照片）" }).click();
    const draftDownload = await draftEvent;
    const draftPath = await draftDownload.path();
    assert(draftPath);
    assert.equal(
      JSON.parse(await readFile(draftPath, "utf8")).evening.events,
      "当前标签页尚未保存的草稿。",
    );
    await page.getByRole("button", { name: "读取当前保存的版本" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /读取|丢弃/, exact: false })
      .last()
      .click();
    await expect(staleEvents).toHaveValue("另一个标签页刚保存的晚间记录。");
    await page.getByRole("button", { name: "删除这一页" }).click();
    await page.getByRole("button", { name: "删除这一天", exact: true }).click();
    await expect(page.locator(".daily-message")).toContainText("已删除");
    await page.getByRole("link", { name: "日记历史", exact: true }).click();
    await expect(page.locator(".daily-history-card")).toHaveCount(1);
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".daily-history-card")).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ["时间轴", "日历", "表格"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `mobile daily ${view} overflow`,
      );
    }
    await page.goto(`${base}/#/daily?date=2026-11-10`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("textbox", { name: "我的初步解读" }),
    ).toHaveValue("先看画面再联系生活");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "mobile editor overflow",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: daily UI drafts/reload/photo/non-fit/date backfill/history views/CSV/full and legacy restore/cross-tab conflict/delete/mobile layout.",
    );
  } finally {
    await browser.close();
  }
}
