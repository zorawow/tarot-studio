import { majorCards } from "./major.ts";
import { minorCards } from "./minor.ts";
export { suitInfo } from "./minor.ts";
export const cards = [...majorCards, ...minorCards];
export const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
export const statusLabels = {
  new: "未学习",
  learning: "学习中",
  familiar: "熟悉",
  mastered: "已掌握",
} as const;
export const imagePath = (id: string) =>
  `${import.meta.env.BASE_URL}cards/${id}.jpg`;
