import assert from "node:assert/strict";
import {
  environmentInfo,
  isEnvironment,
  normalizeStudioPreferences,
  STUDIO_PREFERENCES_KEY,
} from "../src/studioAudio.ts";
assert.equal(STUDIO_PREFERENCES_KEY, "tarot-studio:preferences:v1");
assert.deepEqual(Object.keys(environmentInfo), [
  "forest",
  "sea",
  "lake",
  "rain",
]);
assert(!isEnvironment("__proto__"));
assert(!isEnvironment("toString"));
for (const invalid of [
  null,
  undefined,
  true,
  "rain",
  [],
  { environment: "unknown", audio: { volume: NaN, music: "yes" } },
]) {
  const result = normalizeStudioPreferences(invalid);
  assert.equal(result.environment, "forest");
  assert.equal(result.audio.volume, 0.3);
  assert.equal(result.audio.music, true);
}
const restored = normalizeStudioPreferences({
  environment: "sea",
  skipMotion: true,
  audio: {
    volume: 0.6,
    music: false,
    ambience: true,
    syncEnvironment: false,
    sound: "rain",
    playing: true,
  },
});
assert.equal(restored.environment, "sea");
assert.equal(restored.skipMotion, true);
assert.equal(restored.audio.sound, "rain");
assert.equal(restored.audio.music, false);
assert.equal(restored.audio.volume, 0.6);
assert(
  !("playing" in restored.audio),
  "playback must never restore automatically",
);
assert.equal(
  normalizeStudioPreferences({
    ...restored,
    environment: "lake",
    audio: { ...restored.audio, syncEnvironment: true },
  }).audio.sound,
  "lake",
);
assert.equal(
  normalizeStudioPreferences({ audio: { volume: 4 } }).audio.volume,
  1,
);
assert.equal(
  normalizeStudioPreferences({ audio: { volume: -2 } }).audio.volume,
  0,
);
assert.deepEqual(
  normalizeStudioPreferences(JSON.parse(JSON.stringify(restored))),
  restored,
);
console.log(
  "PASS: four environments, safe preferences, independent sound, sync, volume limits and silent restore.",
);

// Optional real sound-graph check: node --experimental-strip-types tests/studio-settings.test.ts --browser
if (process.argv.includes("--browser")) {
  const { chromium } = await import("@playwright/test");
  const { readFile } = await import("node:fs/promises");
  const { existsSync } = await import("node:fs");
  const ts = await import("typescript");
  const source = await readFile(
    new URL("../src/studioAudio.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
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
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(
      '<button id="start">开始声音</button><button id="pause">暂停</button>',
    );
    await page.addScriptTag({
      content: `
      const exports = {};
      ${compiled}
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.testContext = this; }
      };
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(...args) {
        const result = connect.apply(this, args);
        if (args[0] === window.testContext?.destination && !window.testMeter) {
          window.testMeter = window.testContext.createAnalyser();
          connect.call(this, window.testMeter);
        }
        return result;
      };
      document.getElementById('start').onclick = async () => {
        window.testEngine ??= exports.createStudioAudio(value => window.testPlaying = value);
        window.testEngine.configure(exports.normalizeStudioPreferences(null).audio);
        await window.testEngine.start();
      };
      document.getElementById('pause').onclick = () => window.testEngine.pause();
      window.testRms = () => {
        const samples = new Float32Array(window.testMeter.fftSize);
        window.testMeter.getFloatTimeDomainData(samples);
        return Math.sqrt(samples.reduce((n, x) => n + x*x, 0) / samples.length);
      };
    `,
    });
    assert.equal(
      await page.evaluate("!!window.testContext"),
      false,
      "loading sound module must not create or autoplay audio",
    );
    await page.click("#start");
    await page.waitForFunction("window.testContext?.state === 'running'");
    await page.waitForTimeout(900);
    assert(
      Number(await page.evaluate("window.testRms()")) > 0.00001,
      "piano/ambience must produce a real audio signal",
    );
    for (const sound of ["forest", "sea", "lake", "rain"]) {
      await page.evaluate(
        `window.testEngine.configure({volume:0.4,music:false,ambience:true,syncEnvironment:false,sound:'${sound}'})`,
      );
      await page.waitForTimeout(1100);
      assert(
        Number(await page.evaluate("window.testRms()")) > 0.00001,
        `${sound} soundscape must produce a signal`,
      );
    }
    await page.evaluate(
      "window.testEngine.configure({volume:0,music:false,ambience:true,syncEnvironment:false,sound:'rain'})",
    );
    await page.waitForTimeout(1800);
    assert(
      Number(await page.evaluate("window.testRms()")) < 0.0001,
      "volume zero must mute the actual graph",
    );
    await page.click("#pause");
    await page.waitForFunction(
      "window.testContext.state === 'suspended' && !window.testPlaying",
    );
    await page.evaluate("window.testEngine.dispose()");
    await page.waitForFunction("window.testContext.state === 'closed'");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: user-gesture audio, audible signal in all four environments, volume-zero mute, pause and disposal.",
    );
  } finally {
    await browser.close();
  }
}
