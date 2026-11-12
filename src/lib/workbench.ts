import { cardById, cards } from "../data/cards.ts";
import { deepById } from "../data/deep.ts";
import type { DrawnCard, ReadingDraft } from "../data/types.ts";
import { random, referenceReading, shuffle } from "./learning.ts";

export interface DeckCard {
  cardId: string;
  reversed: boolean;
}
export interface ReadingNotes {
  observation: string;
  symbols: string;
  context: string;
  connections: string;
}
export const blankReadingNotes = (): ReadingNotes => ({
  observation: "",
  symbols: "",
  context: "",
  connections: "",
});

/** One physical deck, shuffled once; orientation is fixed before any card is selected. */
export function createDeck(withReversals: boolean, rng = random): DeckCard[] {
  return shuffle(cards, rng).map((card) => ({
    cardId: card.id,
    reversed: withReversals && rng() < 0.5,
  }));
}

export function selectDeckCard(
  deck: DeckCard[],
  selected: number[],
  index: number,
  positions: string[],
): { selectedIndices: number[]; cards: DrawnCard[] } {
  if (
    deck.length !== 78 ||
    new Set(deck.map((c) => c.cardId)).size !== 78 ||
    deck.some((c) => !cardById[c.cardId] || typeof c.reversed !== "boolean")
  )
    throw new Error("牌组无效，请保留草稿并重新开始一次练习。");
  if (
    !positions.length ||
    positions.length > 78 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= deck.length ||
    selected.some((i) => !Number.isInteger(i) || i < 0 || i >= deck.length) ||
    new Set(selected).size !== selected.length ||
    selected.length > positions.length
  )
    throw new Error("选牌位置无效。");
  const next =
    selected.includes(index) || selected.length >= positions.length
      ? [...selected]
      : [...selected, index];
  return {
    selectedIndices: next,
    cards: next.map((i, n) => ({ ...deck[i], position: positions[n] })),
  };
}

export function combinedInterpretation(
  draft: Pick<ReadingDraft, "interpretation"> & { readingNotes?: ReadingNotes },
): string {
  const notes = draft.readingNotes;
  const sections = notes
    ? (
        [
          ["观察到的画面", notes.observation],
          ["联想到的象征", notes.symbols],
          ["结合当前问题", notes.context],
          ["多张牌的联系", notes.connections],
        ] as const
      )
        .filter(([, text]) => text.trim())
        .map(([title, text]) => `${title}\n${text.trim()}`)
    : [];
  if (draft.interpretation.trim())
    sections.push(`我的独立解读\n${draft.interpretation.trim()}`);
  return sections.join("\n\n");
}

export function referenceAtLevel(drawn: DrawnCard[], level: number): string {
  if (level <= 0 || !drawn.length) return "";
  if (level >= 4) return referenceReading(drawn);
  return drawn
    .map((d) => {
      const c = cardById[d.cardId];
      if (!c) return "";
      const header = `${d.position}｜${c.name}（${d.reversed ? "逆位" : "正位"}）`;
      if (level === 1)
        return `${header}\n先看一个画面：${deepById[c.id].visual[0].detail}\n人物在做什么？你能区分“看见的”与“推测的”吗？先试着连接问题，不急着判断结果。`;
      if (level === 2)
        return `${header}\n基础牌义：${d.reversed ? c.reversed : c.upright}\n记忆线索：${c.memory}\n这是常见主题，不能直接替代你的具体背景。`;
      const position = /建议|行动/.test(d.position)
        ? "advice"
        : /未来|发展/.test(d.position)
          ? "trend"
          : /过去|原因/.test(d.position)
            ? "cause"
            : /阻碍/.test(d.position)
              ? "obstacle"
              : "present";
      return `${header}\n位置在问：${deepById[c.id].positions[position].question}\n怎样使用牌义：${deepById[c.id].positions[position].meaning}\n${d.reversed ? "逆位再选择有情境依据的受阻、过度、不足或内在化镜头；不必全部套用。" : "把牌的主题放进这个位置，不把建议写成结局。"}\n请补一句：“因为我的问题中有……，在这里我会考虑……，还需核实……”。`;
    })
    .join("\n\n");
}
