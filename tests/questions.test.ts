import assert from "node:assert/strict";
import { optimizeQuestion } from "../src/lib/questions.ts";
import {
  academyLessons,
  firstReading,
  questionExamples,
  readingSteps,
} from "../src/data/academy.ts";
for (const raw of [
  "他到底喜不喜欢我？",
  "我什么时候才能找到工作？",
  "我不想离职怎么改善工作？",
  "我不想复合，他会后悔吗？",
  "我不想主动联系，但他喜欢我吗？",
  "明年转行一定成功吗？",
  "我能考上吗？",
  "股票明天肯定涨吗？",
  "官司一定能赢吗？",
  "我是不是怀孕了？",
  "朋友是不是都讨厌我？",
  "量子芒果的回声走向",
  "",
  "a".repeat(700),
]) {
  const result = optimizeQuestion(raw);
  assert.equal(result.suggestions.length, 3);
  assert.equal(new Set(result.suggestions.map((s) => s.question)).size, 3);
  assert(
    result.suggestions.every(
      (s) => s.question.length > 10 && s.reason.length > 10,
    ),
  );
  assert(result.diagnostics.length > 0);
}
assert(
  optimizeQuestion("他到底喜不喜欢我？").diagnostics.some(
    (d) => d.code === "mindreading",
  ),
);
assert(
  optimizeQuestion("我什么时候才能找到工作？").suggestions.every((s) =>
    /求职|岗位|工作/.test(s.question),
  ),
);
assert(
  optimizeQuestion("我不想离职怎么改善工作？").suggestions.every((s) =>
    /留任|岗位/.test(s.question),
  ),
);
assert(
  optimizeQuestion("我不是不想离职，是目前条件不够").diagnostics.some(
    (d) => d.code === "negation",
  ),
);
assert(
  !optimizeQuestion("我不是不想离职，是目前条件不够").suggestions.some((s) =>
    /继续留任的前提/.test(s.question),
  ),
);
assert(
  optimizeQuestion("我不想复合，他会后悔吗？").suggestions[0].question.includes(
    "不恢复关系",
  ),
);
assert(
  optimizeQuestion(
    "我不想主动联系，但他喜欢我吗？",
  ).suggestions[0].question.includes("暂不主动联系"),
);
assert(!optimizeQuestion("量子芒果的回声走向").recognized);
assert(
  optimizeQuestion("工作会怎样，感情又会怎样？").diagnostics.some(
    (d) => d.code === "multiple",
  ),
);
assert(
  !optimizeQuestion("未来一周，我可以怎样平衡工作和学习？").diagnostics.some(
    (d) => d.code === "multiple",
  ),
);
for (const q of ["股票会涨吗？", "官司能赢吗？", "怀孕了怎么办？"])
  assert(optimizeQuestion(q).diagnostics.some((d) => d.code === "boundary"));
assert.equal(academyLessons.length, 5);
assert(
  academyLessons.every(
    (l) => l.sections.length >= 3 && l.minutes >= 5 && l.minutes <= 10,
  ),
);
assert(questionExamples.length >= 15);
assert.equal(readingSteps.length, 10);
assert.equal(new Set(readingSteps.map((s) => s.id)).size, 10);
assert(
  readingSteps.every((s) =>
    [s.operation, s.purpose, s.mistake, s.example, s.caution].every(
      (t) => t.length >= 20,
    ),
  ),
);
assert.equal(firstReading.cardId, "pentacles-8");
assert.equal(firstReading.position, "advice");
console.log(
  "PASS: question optimizer domains, boundaries, negative constraints, fallback, 20 examples, 5 lessons and 10 steps.",
);
