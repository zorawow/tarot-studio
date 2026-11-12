import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { cards, cardById } from "../src/data/cards.ts";
import { lessons, stages } from "../src/data/courses.ts";
import { deepById } from "../src/data/deep.ts";
import {
  positionLabels,
  uprightLabels,
  reversalLabels,
} from "../src/data/deepTypes.ts";
import { readingSteps, questionExamples } from "../src/data/academy.ts";
import { optimizeQuestion } from "../src/lib/questions.ts";
import {
  addDays,
  blankCard,
  bump,
  dateKey,
  drawCards,
  dueCards,
  emptyState,
  makeQuestions,
  migrateState,
  quizModes,
  referenceReading,
  reviewUpdate,
  shuffle,
  streak,
} from "../src/lib/learning.ts";
assert.equal(cards.length, 78);
assert.equal(new Set(cards.map((c) => c.id)).size, 78);
assert.equal(cards.filter((c) => c.suit === "major").length, 22);
for (const suit of ["wands", "cups", "swords", "pentacles"])
  assert.deepEqual(
    cards.filter((c) => c.suit === suit).map((c) => c.number),
    Array.from({ length: 14 }, (_, i) => i + 1),
  );
assert.equal(cardById["major-8"].name, "力量");
assert.equal(cardById["major-11"].name, "正义");
assert.equal(cardById["major-0"].name, "愚者");
assert.equal(cardById["major-21"].name, "世界");
assert.equal(new Set(cards.map((c) => c.story)).size, 78);
assert.equal(new Set(cards.map((c) => c.upright)).size, 78);
assert.equal(new Set(cards.map((c) => c.reversed)).size, 78);
assert.equal(Object.keys(deepById).length, 78);
assert.equal(new Set(Object.values(deepById).map((d) => d.story)).size, 78);
for (const c of cards) {
  const d = deepById[c.id];
  assert(d, c.id);
  assert(d.story.length >= 60, c.id + " story");
  assert(d.visual.length >= 3, c.id + " visuals");
  for (const v of d.visual)
    for (const text of Object.values(v))
      assert(text.length >= 8, c.id + " visual depth");
  assert.deepEqual(
    Object.keys(d.upright).sort(),
    Object.keys(uprightLabels).sort(),
  );
  assert.deepEqual(
    Object.keys(d.reversed).sort(),
    Object.keys(reversalLabels).sort(),
  );
  for (const text of [
    ...Object.values(d.upright),
    ...Object.values(d.reversed),
    ...Object.values(d.contexts),
  ])
    assert(text.length >= 10, c.id + " dimension");
  assert.deepEqual(
    Object.keys(d.positions).sort(),
    Object.keys(positionLabels).sort(),
  );
  for (const position of Object.values(d.positions))
    for (const text of Object.values(position))
      assert(text.length >= 6, c.id + " position");
  assert(d.cases.length >= 2, c.id + " cases");
  assert(
    new Set(d.cases.map((x) => x.position)).size >= 2,
    c.id + " varied positions",
  );
  for (const item of d.cases) {
    assert(item.position in positionLabels);
    for (const key of [
      "title",
      "background",
      "question",
      "observation",
      "symbolism",
      "reasoning",
      "interpretation",
      "alternative",
      "action",
    ] as const)
      assert(item[key].length >= 5, c.id + " case " + key);
  }
  assert.deepEqual(d.exercises.map((x) => x.kind).sort(), [
    "observation",
    "reasoning",
    "scenario",
  ]);
  for (const q of d.exercises) {
    assert.equal(q.options.length, 4, c.id);
    assert.equal(new Set(q.options).size, 4, c.id);
    assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    assert(q.explanation.length > 20, c.id + " explanation");
  }
  assert(
    !/待完善|即将上线|TODO/.test(JSON.stringify(d)),
    c.id + " no placeholder",
  );
}
assert.equal(readingSteps.length, 10);
assert(questionExamples.length >= 15);
for (const step of readingSteps)
  for (const text of [
    step.operation,
    step.purpose,
    step.mistake,
    step.example,
    step.caution,
  ])
    assert(text.length >= 10);
for (const example of questionExamples) {
  assert(example.before && example.after && example.reason);
  assert.equal(optimizeQuestion(example.before).suggestions.length, 3);
}
for (const question of [
  "他到底喜不喜欢我？",
  "我什么时候才能找到工作？",
  "我不想离职，怎么改善现在的工作？",
  "我不想复合，怎样照顾自己？",
  "我的人生怎样？",
  "这次沟通需要留意什么？",
  "我该停止服药吗？",
  "这只股票一定涨吗？",
  "",
]) {
  const result = optimizeQuestion(question);
  assert.equal(result.suggestions.length, 3);
  assert(result.diagnostics.length > 0);
  for (const s of result.suggestions)
    assert(s.question.length >= 10 && s.reason.length >= 10);
}
assert(
  optimizeQuestion("他到底喜不喜欢我？").diagnostics.some(
    (d) => d.code === "mindreading",
  ),
);
assert(
  optimizeQuestion("我什么时候才能找到工作？").diagnostics.some(
    (d) => d.code === "prediction",
  ),
);
assert(
  optimizeQuestion("我不想离职，怎么改善现在的工作？").suggestions.every(
    (s) => !/^(马上|应该|建议)辞职/.test(s.question),
  ),
);
assert.equal(optimizeQuestion("量子毛球的叙事是什么？").recognized, false);
for (const c of cards) {
  assert(c.keywords.length >= 3 && c.keywords.length <= 5);
  assert(c.story.length >= 30, c.name);
  assert(c.symbols.length >= 3);
  assert(c.upright.length >= 20);
  assert(c.reversed.length >= 20);
  assert(c.memory && c.prompt);
  for (const s of c.symbols) assert(s.name && s.meaning);
  for (const x of Object.values(c.contexts)) assert(x.length > 10);
  for (const other of c.compare) assert(cardById[other.id]);
}
assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
assert.equal(new Set(stages.map((s) => s.id)).size, stages.length);
for (const l of lessons) {
  assert(stages.some((s) => s.id === l.stageId));
  assert(l.minutes >= 5 && l.minutes <= 10);
  assert(l.sections.length >= 3);
  assert(l.exercise && l.example);
  for (const id of l.cardIds) assert(cardById[id]);
}
for (let i = 0; i < 1000; i++)
  for (const spread of ["single", "timeline", "guidance"]) {
    const result = drawCards(spread);
    assert.equal(result.length, spread === "single" ? 1 : 3);
    assert.equal(new Set(result.map((c) => c.cardId)).size, result.length);
    for (const c of result) assert(cardById[c.cardId]);
    assert(referenceReading(result).includes("学习参考"));
  }
assert(drawCards("guidance", false).every((c) => !c.reversed));
assert.throws(() => drawCards("missing"));
assert.deepEqual([...shuffle([1, 2, 3, 4])].sort(), [1, 2, 3, 4]);
for (const mode of Object.keys(quizModes) as (keyof typeof quizModes)[]) {
  for (const pool of [
    cards,
    [cards[0]],
    cards.filter((c) => c.suit === "cups"),
  ]) {
    const qs = makeQuestions(pool, mode);
    assert.equal(qs.length, Math.min(10, pool.length));
    for (const q of qs) {
      assert(pool.some((c) => c.id === q.cardId));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert(q.answer >= 0 && q.answer < 4);
      assert(q.explanation.length > 20);
    }
  }
  assert.deepEqual(makeQuestions([], mode), []);
}
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2028-02-28", 1), "2028-02-29");
assert.equal(addDays("2026-10-30", -1), "2026-10-29");
let p = blankCard();
p = reviewUpdate(p, true, "2026-10-30");
assert.equal(p.due, "2026-10-31");
assert.equal(p.interval, 1);
assert.equal(p.status, "learning");
p = reviewUpdate(p, true, "2026-10-31");
assert.equal(p.interval, 3);
p = reviewUpdate(p, false, "2026-11-03");
assert.equal(p.interval, 1);
assert.equal(p.lapses, 1);
assert.equal(p.attempts, 3);
assert.equal(p.correct, 2);
assert.equal(p.status, "learning");
const state = emptyState();
state.cards["major-0"] = p;
assert.equal(dueCards(state, "2026-11-04").length, 1);
assert.equal(dueCards(state, "2026-11-03").length, 0);
bump(state, "lessons", "2026-10-28");
bump(state, "quizzes", "2026-10-29");
assert.equal(streak(state, "2026-10-30"), 2);
bump(state, "cards", "2026-10-30");
assert.equal(streak(state, "2026-10-30"), 3);
assert.equal(streak(state, "2026-11-01"), 0);
assert.deepEqual(migrateState(JSON.parse(JSON.stringify(state))), state);
assert.deepEqual(migrateState({ app: "tarot-academy", data: state }), state);
const legacy = { ...state } as Record<string, unknown>;
delete legacy.readingDraft;
delete legacy.teaching;
delete legacy.questionDraft;
assert.equal(migrateState(legacy).readingDraft, null);
assert.deepEqual(migrateState(legacy).teaching, {});
assert.deepEqual(migrateState(legacy).cards, state.cards);
assert.throws(() =>
  migrateState({ ...state, teaching: { bad: { draft: "missing fields" } } }),
);
assert.throws(() => migrateState({ ...state, questionDraft: { original: 1 } }));
assert.throws(() => migrateState({ schemaVersion: 99 }));
assert.throws(() =>
  migrateState({ ...state, cards: { "major-0": { ...p, correct: 1000 } } }),
);
assert.throws(() =>
  migrateState({
    ...state,
    activity: {
      "2026-02-31": { cards: 1, lessons: 0, quizzes: 0, practices: 0 },
    },
  }),
);
assert.throws(() =>
  migrateState({ ...state, readingDraft: { question: "broken" } }),
);
const future = emptyState();
future.lastLessonId = "future-stage-seven-case-1";
future.lessons["future-stage-seven-case-1"] = {
  response: "a stable ID is retained",
  completedAt: null,
  updatedAt: new Date().toISOString(),
};
assert(migrateState(future).lessons["future-stage-seven-case-1"]);
assert.equal(migrateState(future).lastLessonId, future.lastLessonId);
const folder = new URL("../public/cards/", import.meta.url);
const files = await readdir(folder);
assert.equal(files.filter((f) => f.endsWith(".jpg")).length, 78);
for (const c of cards) {
  const b = await readFile(new URL(`${c.id}.jpg`, folder));
  assert(b.length > 2000);
  assert.equal(b[0], 255);
  assert.equal(b[1], 216);
}
const sources = JSON.parse(
  await readFile(new URL("sources.json", folder), "utf8"),
);
assert.equal(sources.images.length, 78);
assert.equal(new Set(sources.images.map((i: { id: string }) => i.id)).size, 78);
const css = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const luminance = (hex: string) => {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
for (const pattern of [
  /:root\s*\{([^}]+)\}/,
  /:root\[data-theme=["']?light["']?\]\s*\{([^}]+)\}/,
]) {
  const block = pattern.exec(css)![1];
  const token = (key: string) =>
    block.match(new RegExp(`--${key}\\s*:\\s*(#[a-f0-9]{6})`))![1];
  for (const foreground of [
    "text",
    "muted",
    "faint",
    "gold",
    "purple",
    "green",
  ])
    for (const background of ["bg", "panel", "input"]) {
      const a = luminance(token(foreground)),
        b = luminance(token(background));
      assert(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
        `${pattern.source} ${foreground} on ${background}`,
      );
    }
}
console.log(
  `PASS: 78 cards and local images, ${lessons.length} lessons, eight quiz modes and 78 deep microcourses, 3,000 draws, review scheduling, local dates, backup validation and stable future lesson IDs.`,
);
