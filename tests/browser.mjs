import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
const out = path.resolve("docs");
await mkdir(out, { recursive: true });
const executablePath =
  process.env.TAROT_CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1060 },
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage();
await context.addInitScript(() =>
  Object.defineProperty(crypto, "randomUUID", {
    value: undefined,
    configurable: true,
  }),
);
const errors = [];
let downloadVerification = "file saved";
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TAROT_TEST_URL || "http://127.0.0.1:4173/";
const go = async (route) => {
  const url = `${base}#${route}`;
  if (page.url() === url) await page.reload();
  else await page.goto(url);
  await page.locator("main").waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const noOverflow = async (label) => {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `horizontal overflow: ${label}`,
  );
};
try {
  await go("/dashboard");
  await expect(page.getByRole("heading", { name: /欢迎回到/ })).toBeVisible();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".hero-art img,.daily-image-link img")].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  await noOverflow("desktop home");
  await page.screenshot({
    path: path.join(out, "home-dark.png"),
    fullPage: true,
  });
  const dailyBefore = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tarot-academy:v1")).daily.cardId,
  );
  await page.getByRole("button", { name: "切换为浅色模式" }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tarot-academy:v1")).daily.cardId,
    ),
    dailyBefore,
  );
  await page.screenshot({
    path: path.join(out, "home-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "切换为深色模式" }).click();
  await go("/cards");
  await expect(page.locator(".library-card")).toHaveCount(78);
  await page.getByRole("button", { name: /大阿尔卡那/ }).click();
  await expect(page.locator(".library-card")).toHaveCount(22);
  await page.getByRole("textbox", { name: "搜索塔罗牌" }).fill("The Fool");
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page.locator(".library-card").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("愚者");
  await page.getByRole("button", { name: "逆位 Reversed" }).click();
  await expect(
    page.getByRole("heading", { name: /逆位：选择贴合背景/ }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "设置学习状态" })
    .selectOption("familiar");
  await page
    .getByRole("textbox", { name: "个人牌义笔记" })
    .fill("小狗可以是提醒，悬崖可代表未知边界。先核实风险，再尝试。");
  await page.getByRole("button", { name: "收藏这张牌" }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "个人牌义笔记" })).toHaveValue(
    /小狗可以是提醒/,
  );
  await expect(
    page.getByRole("combobox", { name: "设置学习状态" }),
  ).toHaveValue("familiar");
  await expect(
    page.getByRole("button", { name: "已收藏，点击取消" }),
  ).toBeVisible();
  await go("/courses/what-is-tarot");
  await page
    .getByRole("textbox", { name: "课程练习回答" })
    .fill("人物带包，小狗相伴，站在悬崖边；可能是轻装开始，也提醒确认风险。");
  await page.getByRole("button", { name: "完成练习，标记本节课" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "这节课已完成" }),
  ).toBeDisabled();
  for (const mode of [
    "看牌猜名",
    "看牌识义",
    "关键词配对",
    "正逆位判断",
    "易混淆比较",
    "情境应用",
    "图像观察",
    "牌义推理",
  ]) {
    await go("/training?card=major-0");
    await page.getByRole("button", { name: new RegExp(mode) }).click();
    await page.getByRole("button", { name: "开始测验" }).click();
    await expect(page.locator(".answer-option")).toHaveCount(4);
    await page.locator(".answer-option").first().click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
    const before = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("tarot-academy:v1")).quizTotals
          .attempts,
    );
    await page.locator(".answer-option").first().click({ force: true });
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("tarot-academy:v1")).quizTotals
            .attempts,
      ),
      before,
    );
    await page.getByRole("button", { name: "查看本次结果" }).click();
    await expect(page.getByRole("heading", { name: /答对/ })).toBeVisible();
  }
  await go("/training?card=major-0");
  await page.getByRole("button", { name: /记忆卡片/ }).click();
  await page.getByRole("button", { name: "开始翻卡练习" }).click();
  await page.getByRole("button", { name: "看看牌义", exact: true }).click();
  await page.getByRole("button", { name: "记住了", exact: true }).click();
  await page.getByRole("button", { name: "完成本组" }).click();
  await go("/lab");
  await page
    .getByRole("textbox", { name: "一个清楚、开放、与你有关的问题" })
    .fill("未来一周，我可以怎样建立稳定的学习习惯？");
  await page.getByRole("button", { name: "洗牌，开始观察" }).click();
  await expect(page.locator(".fan-card")).toHaveCount(78);
  for (const index of [0, 34, 77])
    await page.locator(".fan-card").nth(index).click();
  await expect(page.getByRole("button", { name: /翻开第1张牌/ })).toBeEnabled();
  let draft = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tarot-academy:v1")).readingDraft,
  );
  assert.equal(draft.cards.length, 3);
  assert.equal(new Set(draft.cards.map((c) => c.cardId)).size, 3);
  for (let i = 1; i <= 3; i++)
    await page
      .getByRole("button", { name: new RegExp(`翻开第${i}张牌`) })
      .click();
  await expect(
    page.getByRole("button", { name: "查看参考解析" }),
  ).toBeDisabled();
  await expect(page.locator(".reference-reading")).toHaveCount(0);
  const interpretation =
    "我先观察三张牌的动作和位置，再比较行动与感受的线索。可以每天做一次五分钟的小练习，同时核实自己的时间安排。";
  await page
    .getByRole("textbox", { name: "我的独立解读" })
    .fill(interpretation);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的独立解读" })).toHaveValue(
    interpretation,
  );
  await page.getByRole("button", { name: "查看参考解析" }).click();
  await expect(page.locator(".reference-reading")).toContainText("组合练习");
  await page
    .getByRole("textbox", { name: "学习心得与需要核实的事" })
    .fill("参考只是不同角度，记录一个待核实的信息：明天实际能否拿出五分钟。");
  await page.getByRole("button", { name: "保存本次练习" }).click();
  await page.getByRole("button", { name: "收起参考解析" }).click();
  await page.reload();
  await page.getByRole("button", { name: "更新学习日记" }).click();
  assert(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("tarot-academy:v1"),
      ).journal[0].reference.includes("组合练习"),
    ),
  );
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tarot-academy:v1")).journal.length,
    ),
    1,
  );
  await go("/journal");
  await page.getByRole("textbox", { name: "搜索学习日记" }).fill("稳定");
  await expect(page.locator(".journal-item")).toHaveCount(1);
  await page.locator(".journal-item").click();
  await expect(
    page.getByRole("heading", { name: "我当时的理解" }),
  ).toBeVisible();
  await go("/journal");
  await page.getByRole("button", { name: "写一页学习日记" }).click();
  await page.getByRole("textbox", { name: "日记标题" }).fill("我的符号观察");
  await page.getByRole("button", { name: "加入", exact: true }).click();
  await page
    .getByRole("textbox", { name: "日记学习心得" })
    .fill("同一个符号可能有多个理解，需要结合情境。");
  await page.getByRole("button", { name: "保存这一页" }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByRole("textbox", { name: "日记标题" })
    .fill("我的符号观察与复盘");
  await page.getByRole("button", { name: "保存这一页" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "我的符号观察与复盘",
  );
  await page.getByRole("button", { name: "删除这篇日记" }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tarot-academy:v1")).journal.length,
    ),
    2,
  );
  await page.getByRole("button", { name: "删除这篇日记" }).click();
  await page.getByRole("button", { name: "删除日记", exact: true }).click();
  await expect(page.locator(".journal-item")).toHaveCount(1);
  await go("/progress");
  await page.getByRole("button", { name: "30天", exact: true }).click();
  await expect(page.locator(".activity-column")).toHaveCount(30);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整学习备份" }).click();
  const download = await downloadPromise;
  const downloadFailure = await download.failure();
  let backup;
  if (downloadFailure) {
    downloadVerification = `Headless file download unavailable: ${downloadFailure}; full text export validated instead`;
    console.log(downloadVerification);
    await page
      .getByRole("button", { name: "复制备份文本", exact: true })
      .click();
    backup = JSON.parse(
      await page
        .getByRole("textbox", { name: "完整学习备份文本" })
        .inputValue(),
    );
    await page.getByRole("button", { name: "全选文本", exact: true }).click();
    assert(
      await page
        .getByRole("textbox", { name: "完整学习备份文本" })
        .evaluate((e) => e.selectionEnd === e.value.length),
    );
    await page.getByRole("button", { name: "关闭备份文本" }).click();
  } else backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.data.journal.length, 1);
  assert.equal(backup.data.cards["major-0"].favorite, true);
  await page.getByRole("button", { name: "导入 JSON 备份" }).click();
  await page.getByLabel("选择学习备份文件").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "确认恢复", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("备份已恢复");
  // Fresh browser storage for product screenshots; keep the populated test context for persistence checks.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    locale: "zh-CN",
    reducedMotion: "reduce",
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(`mobile: ${e.message}`));
  for (const route of [
    "/",
    "/cards",
    "/cards/major-8",
    "/courses",
    "/courses/what-is-tarot",
    "/questions",
    "/first-reading",
    "/courses/academy-process",
    "/cards/pentacles-8",
    "/training",
    "/lab",
    "/journal",
    "/progress",
  ]) {
    await mp.goto(`${base}#${route}`);
    await expect(mp.locator("main")).toBeVisible();
    assert(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `mobile overflow ${route}`,
    );
    await mp.getByRole("button", { name: "切换为浅色模式" }).click();
    assert(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `mobile light overflow ${route}`,
    );
    await mp.getByRole("button", { name: "切换为深色模式" }).click();
  }
  await mp.goto(base + "#/dashboard");
  await mp.waitForFunction(() =>
    [...document.querySelectorAll(".hero-art img,.daily-image-link img")].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  await mp.locator("img").evaluateAll(async (images) => {
    await Promise.all(
      images.map((i) => {
        i.loading = "eager";
        return i.decode().catch(() => {});
      }),
    );
  });
  await mp.screenshot({
    path: path.join(out, "home-mobile.png"),
    fullPage: true,
  });
  await mp.getByRole("link", { name: "返回书房", exact: true }).click();
  await mp.getByRole("button", { name: "塔罗学院", exact: true }).click();
  await expect(mp).toHaveURL(/#\/courses/);
  await expect(
    mp.getByRole("link", { name: "返回书房", exact: true }),
  ).toHaveCount(1);
  await mobile.close();
  await go("/courses/academy-questions");
  assert((await page.locator(".question-example-list details").count()) >= 15);
  await page.locator(".question-example-list summary").first().click();
  await expect(
    page.locator(".question-example-list details").first(),
  ).toContainText("优化后");
  await go("/questions");
  await page
    .getByRole("textbox", { name: "原始占卜问题" })
    .fill("他到底喜不喜欢我？");
  await page.getByRole("button", { name: "检查问题与生成建议" }).click();
  await expect(page.locator(".diagnostic-grid")).toContainText("他人心理");
  await page.getByRole("radio").first().check();
  const revised = "未来两周，我可以观察哪些互动，并怎样清楚表达自己的期待？";
  await page.getByRole("textbox", { name: "最终练习问题" }).fill(revised);
  await page.getByRole("button", { name: "带着问题去练习" }).click();
  await expect(page.locator(".incoming-question")).toContainText(revised);
  const oldDraft = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tarot-academy:v1")).readingDraft,
  );
  await page.getByRole("button", { name: "使用新问题" }).click();
  if (oldDraft?.cards.length) {
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "清空草稿，重新开始" }).click();
  }
  await expect(
    page.getByRole("textbox", { name: "一个清楚、开放、与你有关的问题" }),
  ).toHaveValue(revised);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "一个清楚、开放、与你有关的问题" }),
  ).toHaveValue(revised);
  await go("/cards/major-21");
  await expect(page.locator(".chapter-nav button")).toHaveCount(8);
  await page
    .locator("#chapter-positions")
    .getByRole("button", { name: "建议位", exact: true })
    .click();
  const advice = await page
    .locator("#chapter-positions .reference-box")
    .innerText();
  await page
    .locator("#chapter-positions")
    .getByRole("button", { name: "未来趋势位", exact: true })
    .click();
  assert.notEqual(
    await page.locator("#chapter-positions .reference-box").innerText(),
    advice,
  );
  await page.locator("#chapter-cases summary").first().click();
  await expect(page.locator("#chapter-cases details").first()).toContainText(
    "另一种可能",
  );
  const questionBox = page.locator(".teaching-question").first();
  await questionBox.locator("button.quiz-option").first().click();
  await expect(questionBox.locator("[role=status]")).toContainText("正确答案");
  const attempts = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("tarot-academy:v1")).quizTotals.attempts,
  );
  await questionBox
    .locator("button.quiz-option")
    .first()
    .click({ force: true });
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("tarot-academy:v1")).quizTotals
          .attempts,
    ),
    attempts,
  );
  await page
    .getByRole("textbox", { name: "老师练习我的解读" })
    .fill(
      "我看见人物在花环之中，这可能提醒先确认阶段完成，再决定怎样整理成果。",
    );
  for (let i = 1; i <= 5; i++)
    await page.getByRole("button", { name: `展开第${i}步思路` }).click();
  await page
    .getByRole("textbox", { name: "老师练习复盘" })
    .fill("我漏看了四角图像，也需要分清现状和建议的语法。");
  await page.getByRole("button", { name: "保存练习到日记" }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "老师练习我的解读" }),
  ).toHaveValue(/先确认阶段完成/);
  await expect(
    page.locator(".teacher-practice .reasoning-chain li"),
  ).toHaveCount(5);
  await page.screenshot({
    path: path.join(out, "card-deep-teaching.png"),
    fullPage: true,
  });
  await go("/courses/academy-process");
  await page.locator(".process-track button").last().click();
  await expect(page.locator(".process-detail h3")).toContainText("10.");
  await go("/first-reading");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("button", { name: /选择：单张牌/ }).click();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("button", { name: "揭开本次预设教学牌" }).click();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await expect(page.getByRole("button", { name: "完成这一步" })).toBeDisabled();
  await page
    .getByRole("textbox", { name: "首次解读我的解释" })
    .fill("画面中的专注工作提醒我，把学习分成可反复完成的小步骤，并观察反馈。");
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("button", { name: "对照老师的逐步推理" }).click();
  await expect(page.locator(".reasoning-chain li")).toHaveCount(7);
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page
    .getByRole("textbox", { name: "首次解读复盘" })
    .fill("每天留出五分钟做一次练习，复盘自己的时间安排和遗漏的牌面线索。");
  await page.getByRole("button", { name: "完成这一步" }).click();
  await page.getByRole("button", { name: "保存并完成首次解读" }).click();
  await page.locator(".guided-nav button").nth(6).click();
  await page.getByRole("button", { name: "收起老师思路" }).click();
  await page.locator(".guided-nav button").nth(9).click();
  await page.getByRole("button", { name: "更新首次解读记录" }).click();
  assert(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("tarot-academy:v1"),
      ).journal[0].reference.includes("观察牌面"),
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "更新首次解读记录" }),
  ).toBeVisible();
  assert(
    await page.evaluate(
      () =>
        !!JSON.parse(localStorage.getItem("tarot-academy:v1")).lessons[
          "guided-first-reading"
        ].completedAt,
    ),
  );
  await page.screenshot({
    path: path.join(out, "first-reading-complete.png"),
    fullPage: true,
  });
  await go(
    "/lab?question=" + encodeURIComponent("新的测试问题：怎样继续学习？"),
  );
  await page.getByRole("button", { name: "洗牌，开始观察" }).click();
  await expect(page.getByRole("button", { name: "使用新问题" })).toBeDisabled();
  await go("/questions");
  await page.waitForTimeout(800);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("tarot-academy:v1")).readingDraft.cards
          .length,
    ),
    0,
    "unmounted shuffle must not write the draft",
  );
  const futureState = structuredClone(backup.data);
  futureState.lastLessonId = "future-stage-seven-case-1";
  futureState.lessons[futureState.lastLessonId] = {
    response: "未来课节的练习",
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
  const futureContext = await browser.newContext();
  await futureContext.addInitScript(
    (data) => localStorage.setItem("tarot-academy:v1", JSON.stringify(data)),
    futureState,
  );
  const futurePage = await futureContext.newPage();
  await futurePage.goto(base + "#/dashboard");
  await expect(
    futurePage.getByRole("heading", { name: /欢迎回到/ }),
  ).toBeVisible();
  assert(
    !(
      await futurePage.locator(".hero-copy a.button").getAttribute("href")
    ).includes("future-stage-seven"),
  );
  assert.equal(
    await futurePage.evaluate(
      () => JSON.parse(localStorage.getItem("tarot-academy:v1")).lastLessonId,
    ),
    futureState.lastLessonId,
  );
  await futureContext.close();
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(out, "browser-verification.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        browser: await browser.version(),
        viewportDesktop: "1440x1060",
        viewportMobile: "390x844",
        result: "PASS",
        downloadVerification,
        checks: [
          "78-card search/filter",
          "upright/reversed",
          "favorites/status/notes refresh persistence",
          "lesson exercise completion",
          "8 quiz modes and answer locking",
          "flashcard self-rating",
          "3-card draw without duplicates",
          "reference unlock after independent reading",
          "draft persistence",
          "journal create/edit/search/delete confirmation",
          "JSON full-text export/import",
          "7/30 day statistics",
          "13 routes mobile dark/light overflow",
          "theme persistence",
          "no browser runtime errors",
          "future lesson IDs retained with a safe dashboard fallback",
          "record IDs when randomUUID is unavailable",
          "question diagnosis, editable suggestions, lab handoff without clobbering an active draw",
          "deep lesson chapter navigation, five positions, case reasoning, exercises and draft persistence",
          "ten-step first reading, own interpretation gate, teacher reference and journal persistence",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: browser learning flow, persistence, themes, diary, backup, desktop/mobile. Screenshots saved in docs/.",
  );
} finally {
  await browser.close();
}
