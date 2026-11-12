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

try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.addInitScript(() => {
    window.studioStartedTracks = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const result = start.apply(this, args);
      window.studioStartedTracks.push({
        duration: Math.round(this.buffer.duration),
        audible: this.buffer
          .getChannelData(0)
          .some((frame) => Math.abs(frame) > 0.01),
        loop: this.loop,
      });
      return result;
    };
  });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.includes("/studio/audio/") && pathname.endsWith(".mp3"))
      requests.push(pathname.split("/").at(-1));
  });
  const durations = () =>
    page.evaluate(() =>
      window.studioStartedTracks.map((track) => track.duration),
    );
  const controls = () =>
    page.getByRole("button", { name: "声音设置", exact: true }).click();
  const play = page.getByRole("button", { name: /开启声音/ });
  const pause = page.getByRole("button", { name: /暂停声音/ });
  const music = page.getByRole("checkbox", { name: /钢琴/ });
  const pianoTrack = page.getByRole("combobox", { name: "钢琴曲目" });
  const followsWindow = page.getByRole("checkbox", { name: "声音跟随窗景" });
  await page.goto(`${base}#/`);
  await controls();
  await music.uncheck();
  assert.deepEqual(
    requests,
    [],
    "Opening controls and editing settings keep audio unloaded",
  );
  assert.deepEqual(await durations(), []);
  await play.click();
  await expect.poll(durations).toEqual([29]);
  assert.deepEqual(requests, ["forest.mp3"]);
  await music.check();
  await expect.poll(durations).toEqual([29, 184]);
  assert.deepEqual(requests, ["forest.mp3", "piano.mp3"]);

  await page.getByText("环境音设置", { exact: true }).click();
  await followsWindow.uncheck();
  const environment = page.getByRole("combobox", { name: "独立环境声音" });
  await environment.selectOption("lake");
  await expect.poll(durations).toEqual([29, 184, 29]);
  await environment.selectOption("rain");
  await expect.poll(durations).toEqual([29, 184, 29, 36]);
  await followsWindow.check();
  await expect.poll(durations).toEqual([29, 184, 29, 36, 29]);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "切换自然环境" }).click();
  await page
    .locator(".studio-panel-environment")
    .getByRole("button", { name: /海边书房/ })
    .click();
  await expect.poll(durations).toEqual([29, 184, 29, 36, 29, 31]);
  assert.deepEqual(requests, [
    "forest.mp3",
    "piano.mp3",
    "lake.mp3",
    "rain.mp3",
    "forest.mp3",
    "sea.mp3",
  ]);
  assert.ok(
    await page.evaluate(() =>
      window.studioStartedTracks.every((track) => track.audible && track.loop),
    ),
  );

  await page.goto(`${base}#/lab`);
  await controls();
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(play).toBeVisible();
  await play.click();
  await expect(pause).toBeVisible();
  assert.equal(
    requests.length,
    6,
    "Resuming keeps the loaded playback buffers",
  );

  await expect(pianoTrack).toHaveValue("gymnopedie");
  await expect(pianoTrack.locator("option")).toHaveCount(3);
  await pause.click();
  await expect(play).toBeVisible();
  await pianoTrack.selectOption("bach-prelude");
  assert.equal(
    requests.length,
    6,
    "Selecting a stopped track keeps it unloaded",
  );
  await play.click();
  await expect.poll(durations).toEqual([29, 184, 29, 36, 29, 31, 163]);
  assert.equal(requests.at(-1), "bach-prelude.mp3");
  await pianoTrack.selectOption("chopin-nocturne");
  await expect.poll(durations).toHaveLength(8);
  assert.ok(Math.abs((await durations()).at(-1) - 271.5) <= 1);
  assert.equal(requests.at(-1), "chopin-nocturne.mp3");
  assert.equal(requests.length, 8, "Changing piano never reloads the ambience");
  assert.ok(
    await page.evaluate(() =>
      window.studioStartedTracks.every((track) => track.audible && track.loop),
    ),
  );

  await page.reload();
  await controls();
  await expect(play).toBeVisible();
  await expect(pianoTrack).toHaveValue("chopin-nocturne");
  assert.deepEqual(await durations(), []);
  assert.equal(
    requests.length,
    8,
    "A fresh document remains silent and does not download tracks",
  );
  const [credits] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "声音来源", exact: true }).click(),
  ]);
  await expect(
    credits.getByRole("heading", { name: "声音来源" }),
  ).toBeVisible();
  await expect(credits.locator("main")).toContainText(
    /Robin Alciatore[\s\S]*Luftrum/,
  );
  await expect(credits.locator("main")).toContainText(
    /Kimiko Ishizaka[\s\S]*Frank Lévy/,
  );
  console.log(
    "PASS: all three piano recordings and four soundscapes decode and loop, with lazy track selection, scene following, route persistence and no autoplay.",
  );
} finally {
  await browser.close();
}
