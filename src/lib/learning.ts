import { cards, cardById } from "../data/cards.ts";
import { deepById } from "../data/deep.ts";
import type {
  CardProgress,
  DrawnCard,
  LearningState,
  Suit,
  TarotCard,
} from "../data/types.ts";
export const STORAGE_KEY = "tarot-academy:v1";
export const blankCard = (): CardProgress => ({
  status: "new",
  favorite: false,
  note: "",
  updatedAt: "",
  correct: 0,
  attempts: 0,
  lapses: 0,
  interval: 0,
  due: null,
});
export const emptyState = (): LearningState => ({
  schemaVersion: 1,
  cards: {},
  lessons: {},
  journal: [],
  activity: {},
  lastLessonId: null,
  recentCards: [],
  daily: null,
  quizTotals: { correct: 0, attempts: 0 },
  readingDraft: null,
  teaching: {},
  questionDraft: { original: "", selected: "", updatedAt: "" },
});
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function validDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(new Date(`${s}T12:00:00`).getTime()) &&
    dateKey(new Date(`${s}T12:00:00`)) === s
  );
}
export function random(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
export function recordId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // 手机通过局域网 HTTP 打开时 randomUUID 可能不可用；getRandomValues 仍可生成128位记录ID。
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function shuffle<T>(items: readonly T[], rng = random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const spreads = [
  {
    id: "single",
    name: "单张启示",
    description: "一个问题，一次专注观察",
    positions: ["当下的观察"],
  },
  {
    id: "timeline",
    name: "过去 · 现在 · 未来",
    description: "理解来路与有条件的可能走向",
    positions: ["过去的经验", "现在的状态", "未来的可能"],
  },
  {
    id: "guidance",
    name: "情况 · 建议 · 可能发展",
    description: "从情境走向一个可尝试的行动",
    positions: ["当前情况", "可尝试的建议", "可能的发展"],
  },
  {
    id: "obstacle",
    name: "现状 · 阻碍 · 建议",
    description: "看清处境、辨认困难，再寻找可尝试的回应",
    positions: ["现状", "阻碍", "建议"],
  },
  {
    id: "action",
    name: "情况 · 行动 · 可能发展",
    description: "从目前条件连接自己的行动与条件性的走向",
    positions: ["情况", "行动", "可能发展"],
  },
];
export function drawCards(
  spreadId: string,
  reversals = true,
  rng = random,
): DrawnCard[] {
  const spread = spreads.find((s) => s.id === spreadId);
  if (!spread) throw new Error("未知牌阵");
  return shuffle(cards, rng)
    .slice(0, spread.positions.length)
    .map((c, i) => ({
      cardId: c.id,
      reversed: reversals && rng() < 0.5,
      position: spread.positions[i],
    }));
}
export function referenceReading(drawn: DrawnCard[]): string {
  const lines = drawn.map((d) => {
    const c = cardById[d.cardId];
    if (!c) return "";
    const direction = d.reversed ? c.reversed : c.upright;
    const teaching = deepById[c.id];
    const positionKey = d.position.includes("建议")
      ? "advice"
      : /未来|发展/.test(d.position)
        ? "trend"
        : /过去|原因/.test(d.position)
          ? "cause"
          : /阻碍/.test(d.position)
            ? "obstacle"
            : "present";
    const frame = d.position.includes("建议")
      ? "将它转为一项可撤回的小行动，不把牌义当作必须服从的指令。"
      : d.position.includes("未来") || d.position.includes("发展")
        ? "仅在相关条件持续时考虑这种可能，请用后续观察核实。"
        : d.position.includes("过去")
          ? "把它作为回顾经验的一个角度，不据此补出未提供的事件。"
          : "先核对它是否贴合真实处境，不贴合时保留其他解释。";
    return `${d.position}｜${c.name}（${d.reversed ? "逆位" : "正位"}）\n观察线索：${teaching.visual[0].detail}\n象征联系：${teaching.visual[0].reading} ${teaching.visual[0].bridge}\n学习参考：${direction}\n结合位置：${teaching.positions[positionKey].meaning}\n位置提示：${frame}\n联系你的问题：挑选与已知事实贴合的一条线索，说明“因为问题中有……，放在此位置可理解为……”。系统未判断你的具体经历，不能直接补出背景。`;
  });
  if (drawn.length > 1) {
    const list = drawn.map((d) => cardById[d.cardId]);
    const counts = new Map<Suit, number>();
    list.forEach((c) => counts.set(c.suit, (counts.get(c.suit) || 0) + 1));
    const repeated = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(
        ([s]) =>
          ({
            major: "成长主题",
            wands: "行动与创造",
            cups: "情绪与联结",
            swords: "思考与沟通",
            pentacles: "资源与日常",
          })[s],
      );
    lines.push(
      `组合练习\n1. 先比较主题：${list.map((c) => `${c.name}的“${c.keywords[0]}”`).join(" → ")}。${repeated.length ? `重复出现${repeated.join("、")}的视角，可检查是否确实是问题重点。` : "花色视角不同，试着让行动、感受、思想与资源互相补充。"}\n2. 再比较画面：人物的动作、方向、环境是否延续或形成张力？不要为了连成故事补出具体人物或事件。\n3. 将第二个位置与前后两张联系，写出“如果……我可以尝试……还需确认……”；有${drawn.filter((d) => d.reversed).length}张逆位，逐一选择受阻、过度、不足或内在化的镜头，不按数量判断吉凶。`,
    );
  } else
    lines.push(
      "独立思考提示\n挑一个图像细节，连接你的问题，再提出一个今天可做的小行动和一条需要核实的信息。",
    );
  return (
    lines.join("\n\n") +
    "\n\n以上是规则生成的学习参考，不是确定性预测；健康、法律、财务等决定应依据现实信息与专业意见。"
  );
}
export function reviewUpdate(
  p: CardProgress,
  correct: boolean,
  today = dateKey(),
): CardProgress {
  const attempts = p.attempts + 1,
    right = p.correct + (correct ? 1 : 0);
  const interval = correct
    ? Math.min(
        60,
        p.interval === 0
          ? 1
          : p.interval === 1
            ? 3
            : Math.ceil(p.interval * 1.8),
      )
    : 1;
  const status = correct
    ? attempts >= 5 && right / attempts >= 0.85
      ? "mastered"
      : attempts >= 3 && right / attempts >= 0.65
        ? "familiar"
        : p.status === "mastered"
          ? "mastered"
          : "learning"
    : "learning";
  return {
    ...p,
    attempts,
    correct: right,
    lapses: p.lapses + (correct ? 0 : 1),
    interval,
    due: addDays(today, interval),
    status,
    updatedAt: new Date().toISOString(),
  };
}
export const dueCards = (s: LearningState, today = dateKey()) =>
  cards
    .filter(
      (c) =>
        s.cards[c.id]?.status !== "new" &&
        s.cards[c.id]?.due &&
        s.cards[c.id].due! <= today,
    )
    .sort(
      (a, b) =>
        (s.cards[a.id].due || "").localeCompare(s.cards[b.id].due || "") ||
        s.cards[b.id].lapses - s.cards[a.id].lapses,
    );
export const weakCards = (s: LearningState) =>
  cards
    .filter((c) => {
      const p = s.cards[c.id];
      return (
        p && ((p.attempts > 0 && p.correct / p.attempts < 0.7) || p.lapses >= 2)
      );
    })
    .sort((a, b) => s.cards[b.id].lapses - s.cards[a.id].lapses);
export function streak(s: LearningState, today = dateKey()): number {
  let d = s.activity[today] ? today : addDays(today, -1);
  let n = 0;
  while (s.activity[d]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export function activityDays(
  s: LearningState,
  days: number,
  today = dateKey(),
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const a = s.activity[date];
    return {
      date,
      value: a ? Object.values(a).reduce((x, y) => x + y, 0) : 0,
      ...a,
    };
  });
}
export type QuizMode =
  | "name"
  | "meaning"
  | "keywords"
  | "orientation"
  | "compare"
  | "observation"
  | "reasoning"
  | "scenario";
// ponytail: 题库直接复用逐张牌的自编练习，避免维护两份答案。
export const quizModes: Record<QuizMode, string> = {
  name: "看牌猜名",
  meaning: "看牌识义",
  keywords: "关键词配对",
  orientation: "正逆位判断",
  compare: "易混淆比较",
  scenario: "情境应用",
  observation: "图像观察",
  reasoning: "牌义推理",
};
export interface Question {
  id: string;
  cardId: string;
  mode: QuizMode;
  title: string;
  options: string[];
  answer: number;
  explanation: string;
  showImage: boolean;
  reversed: boolean;
}
export function makeQuestions(
  pool: TarotCard[],
  mode: QuizMode,
  count = 10,
  rng = random,
): Question[] {
  if (!pool.length) return [];
  const chosen = shuffle(pool, rng).slice(0, count);
  return chosen.map((c, i) => {
    if (mode === "scenario" || mode === "observation" || mode === "reasoning") {
      const q = deepById[c.id].exercises.find((e) => e.kind === mode)!;
      const options = shuffle(q.options, rng);
      return {
        id: `${mode}-${c.id}-${i}`,
        cardId: c.id,
        mode,
        title: q.question,
        options,
        answer: options.indexOf(q.options[q.answer]),
        explanation: q.explanation,
        showImage: true,
        reversed: /逆位/.test(q.question),
      };
    }
    const others = shuffle(
      cards.filter((x) => x.id !== c.id && x.id !== c.compare[0].id),
      rng,
    ).slice(0, 3);
    let title = "",
      correct = "",
      wrong: string[] = [],
      explanation = "",
      showImage = false,
      reversed = false;
    if (mode === "name" || mode === "keywords") {
      title =
        mode === "name"
          ? "观察牌面，它的中文名称是什么？"
          : `“${c.keywords.join(" · ")}”最直接对应本课哪张牌？`;
      correct = c.name;
      wrong = others.map((x) => x.name);
      showImage = mode === "name";
      explanation = `${c.name}：${c.memory} ${c.symbols[0].name}可联系${c.symbols[0].meaning}。`;
    } else if (mode === "meaning") {
      title = "依据本课，这张牌最贴近哪组核心主题？";
      correct = c.keywords.join(" · ");
      wrong = others.map((x) => x.keywords.join(" · "));
      showImage = true;
      explanation = `${c.name}的画面：${c.story}`;
    } else if (mode === "orientation") {
      reversed = rng() < 0.5;
      showImage = true;
      title = `${c.name}（${reversed ? "逆位" : "正位"}）：哪项是本课推荐的理解方式？`;
      correct = reversed ? c.reversed : c.upright;
      wrong = [
        reversed ? c.upright : c.reversed,
        "正位总是好事，逆位总是坏事。",
        "牌的方向能够确定事件的真实结果。",
      ];
      explanation = `本题关注${reversed ? "逆位的多种表达，而不是简单反义" : "核心主题的常见表达"}。${correct}`;
    } else if (mode === "compare") {
      const other = cardById[c.compare[0].id];
      title = `${c.name}与${other.name}，哪项比较更有依据？`;
      correct = c.compare[0].difference;
      wrong = [
        `${c.name}重点是“${other.keywords.slice(0, 2).join("、")}”；${other.name}更偏向“${c.keywords.slice(0, 2).join("、")}”。`,
        `${c.name}与${other.name}都只强调“${c.keywords[0]}”，可以忽略画面中的动作差别。`,
        `${c.name}重点是“${others[0].keywords.slice(0, 2).join("、")}”；${other.name}更偏向“${others[1].keywords.slice(0, 2).join("、")}”。`,
      ];
      explanation = `${correct} ${c.name}的记忆线索：${c.memory}`;
    } else {
      title = `情境练习：“${c.contexts.growth}”\n抽到${c.name}时，哪项建议最直接呼应它在本课的核心主题？`;
      correct = c.contexts.work;
      wrong = others.map((o) => o.contexts.work);
      explanation = `参考回应：${correct} 图像依据：${c.symbols[0].name}——${c.symbols[0].meaning}。其他选项可能有一般价值，本题练习辨认与当前牌面主题最直接的联系，不是预测对错。`;
    }
    const options = shuffle([correct, ...wrong], rng);
    return {
      id: `${mode}-${c.id}-${i}`,
      cardId: c.id,
      mode,
      title,
      options,
      answer: options.indexOf(correct),
      explanation,
      showImage,
      reversed,
    };
  });
}
// ponytail: 版本1用一个明确的迁移入口；新增格式时在这里逐版本迁移，保留稳定的课程/练习ID。
const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown, max = 50000): x is string =>
  typeof x === "string" && x.length <= max;
const nat = (x: unknown): x is number =>
  Number.isSafeInteger(x) && Number(x) >= 0;
const timestamp = (x: unknown) =>
  str(x, 100) && (x === "" || Number.isFinite(Date.parse(x)));
export function migrateState(input: unknown): LearningState {
  const x = obj(input) && "data" in input ? input.data : input;
  if (!obj(x) || x.schemaVersion !== 1)
    throw new Error("不支持的备份版本，请使用本应用导出的 JSON。");
  if (
    !obj(x.cards) ||
    !obj(x.lessons) ||
    !Array.isArray(x.journal) ||
    !obj(x.activity) ||
    !obj(x.quizTotals)
  )
    throw new Error("备份缺少必要的学习数据。");
  if (
    Object.keys(x.cards).length > 1000 ||
    Object.keys(x.lessons).length > 10000 ||
    x.journal.length > 50000
  )
    throw new Error("数据量超出当前版本支持范围。");
  for (const [id, p] of Object.entries(x.cards)) {
    if (
      !cardById[id] ||
      !obj(p) ||
      !["new", "learning", "familiar", "mastered"].includes(String(p.status)) ||
      typeof p.favorite !== "boolean" ||
      !str(p.note) ||
      !timestamp(p.updatedAt) ||
      !["correct", "attempts", "lapses", "interval"].every((k) => nat(p[k])) ||
      Number(p.correct) > Number(p.attempts) ||
      (p.due !== null && !validDate(p.due))
    )
      throw new Error("牌学习状态格式无效。");
  }
  for (const [id, p] of Object.entries(x.lessons))
    if (
      !/^[a-z0-9-]+$/.test(id) ||
      !obj(p) ||
      !str(p.response) ||
      !timestamp(p.updatedAt) ||
      (p.completedAt !== null && !timestamp(p.completedAt))
    )
      throw new Error("课节记录格式无效。");
  const ids = new Set<string>();
  for (const r of x.journal) {
    if (
      !obj(r) ||
      !str(r.id, 150) ||
      ids.has(r.id) ||
      !["reading", "reflection"].includes(String(r.kind)) ||
      !validDate(r.date) ||
      !timestamp(r.createdAt) ||
      !timestamp(r.updatedAt) ||
      ![
        "title",
        "question",
        "spreadId",
        "interpretation",
        "reference",
        "reflection",
      ].every((k) => str(r[k])) ||
      !Array.isArray(r.cards) ||
      r.cards.length > 78 ||
      !Array.isArray(r.tags) ||
      r.tags.length > 100 ||
      !r.tags.every((t) => str(t, 100))
    )
      throw new Error("日记记录格式无效。");
    ids.add(r.id);
    for (const c of r.cards)
      if (
        !obj(c) ||
        !str(c.cardId, 100) ||
        !cardById[c.cardId] ||
        typeof c.reversed !== "boolean" ||
        !str(c.position, 200)
      )
        throw new Error("日记牌面数据无效。");
    if (
      new Set(r.cards.map((c) => (c as { cardId: string }).cardId)).size !==
      r.cards.length
    )
      throw new Error("同一次练习存在重复实体牌。");
  }
  for (const [d, a] of Object.entries(x.activity))
    if (
      !validDate(d) ||
      !obj(a) ||
      !["cards", "quizzes", "lessons", "practices"].every((k) => nat(a[k]))
    )
      throw new Error("学习活动格式无效。");
  if (
    !nat(x.quizTotals.correct) ||
    !nat(x.quizTotals.attempts) ||
    Number(x.quizTotals.correct) > Number(x.quizTotals.attempts) ||
    !(x.lastLessonId === null || str(x.lastLessonId, 100)) ||
    !Array.isArray(x.recentCards) ||
    !x.recentCards.every((c) => str(c, 100) && !!cardById[c])
  )
    throw new Error("学习摘要格式无效。");
  if (
    x.daily !== null &&
    (!obj(x.daily) ||
      !validDate(x.daily.date) ||
      !str(x.daily.cardId, 100) ||
      !cardById[x.daily.cardId])
  )
    throw new Error("每日卡牌格式无效。");
  if (x.readingDraft !== undefined && x.readingDraft !== null) {
    const d = x.readingDraft;
    if (
      !obj(d) ||
      !str(d.question) ||
      !str(d.spreadId, 100) ||
      !spreads.some((s) => s.id === d.spreadId) ||
      typeof d.withReversals !== "boolean" ||
      !str(d.interpretation) ||
      !str(d.reflection) ||
      typeof d.referenceVisible !== "boolean" ||
      (d.referenceViewed !== undefined &&
        typeof d.referenceViewed !== "boolean") ||
      !(d.recordId === null || str(d.recordId, 150)) ||
      !Array.isArray(d.cards) ||
      d.cards.length > 3 ||
      !Array.isArray(d.flipped) ||
      !d.flipped.every(
        (id) =>
          str(id, 100) &&
          d.cards instanceof Array &&
          d.cards.some((c) => obj(c) && c.cardId === id),
      )
    )
      throw new Error("解牌草稿格式无效。");
    for (const c of d.cards)
      if (
        !obj(c) ||
        !str(c.cardId, 100) ||
        !cardById[c.cardId] ||
        typeof c.reversed !== "boolean" ||
        !str(c.position, 200)
      )
        throw new Error("解牌草稿的牌面无效。");
    if (
      new Set(d.cards.map((c) => (c as { cardId: string }).cardId)).size !==
      d.cards.length
    )
      throw new Error("解牌草稿存在重复牌。");
    if (d.deck !== undefined) {
      if (
        !Array.isArray(d.deck) ||
        ![0, 78].includes(d.deck.length) ||
        (d.deck.length === 0 && d.cards.length > 0) ||
        !d.deck.every(
          (c) =>
            obj(c) &&
            str(c.cardId, 100) &&
            !!cardById[c.cardId] &&
            typeof c.reversed === "boolean",
        ) ||
        new Set(d.deck.map((c) => (c as { cardId: string }).cardId)).size !==
          d.deck.length
      )
        throw new Error("洗牌后的牌组格式无效。");
    }
    if (d.selectedIndices !== undefined) {
      if (
        !Array.isArray(d.selectedIndices) ||
        d.selectedIndices.length > 3 ||
        new Set(d.selectedIndices).size !== d.selectedIndices.length ||
        !d.selectedIndices.every((i) => nat(i) && Number(i) < 78) ||
        !Array.isArray(d.deck) ||
        d.selectedIndices.length !== d.cards.length
      )
        throw new Error("选牌记录格式无效。");
      for (let i = 0; i < d.selectedIndices.length; i++) {
        const source = d.deck[d.selectedIndices[i] as number] as {
          cardId: string;
          reversed: boolean;
        };
        const selected = d.cards[i] as { cardId: string; reversed: boolean };
        if (
          source.cardId !== selected.cardId ||
          source.reversed !== selected.reversed
        )
          throw new Error("选牌与原牌组不一致。");
      }
    }
    if (
      d.readingNotes !== undefined &&
      (!obj(d.readingNotes) ||
        !["observation", "symbols", "context", "connections"].every((k) =>
          str((d.readingNotes as Record<string, unknown>)[k], 20000),
        ))
    )
      throw new Error("分步解读草稿无效。");
    if (
      d.hintLevel !== undefined &&
      (!nat(d.hintLevel) || Number(d.hintLevel) > 4)
    )
      throw new Error("参考展开层级无效。");
  }
  if (x.teaching !== undefined) {
    if (!obj(x.teaching) || Object.keys(x.teaching).length > 10000)
      throw new Error("教学练习格式无效。");
    for (const [id, p] of Object.entries(x.teaching)) {
      if (
        !/^[a-z0-9-]+$/.test(id) ||
        !obj(p) ||
        !str(p.draft) ||
        !str(p.reflection) ||
        !nat(p.revealedSteps) ||
        Number(p.revealedSteps) > 10 ||
        !obj(p.answers) ||
        !Object.values(p.answers).every(
          (a) => Number.isInteger(a) && Number(a) >= -1 && Number(a) <= 20,
        ) ||
        !timestamp(p.updatedAt) ||
        !(p.completedAt === null || timestamp(p.completedAt)) ||
        !(p.recordId === null || str(p.recordId, 150))
      )
        throw new Error("教学练习记录无效。");
    }
  }
  if (
    x.questionDraft !== undefined &&
    (!obj(x.questionDraft) ||
      !str(x.questionDraft.original, 500) ||
      !str(x.questionDraft.selected, 500) ||
      !timestamp(x.questionDraft.updatedAt))
  )
    throw new Error("提问草稿格式无效。");
  return {
    ...structuredClone(x),
    teaching: x.teaching ?? {},
    questionDraft: x.questionDraft ?? {
      original: "",
      selected: "",
      updatedAt: "",
    },
    readingDraft: x.readingDraft ?? null,
  } as unknown as LearningState;
}
export function bump(
  s: LearningState,
  key: "cards" | "quizzes" | "lessons" | "practices",
  today = dateKey(),
) {
  s.activity[today] ??= { cards: 0, quizzes: 0, lessons: 0, practices: 0 };
  s.activity[today][key]++;
}
