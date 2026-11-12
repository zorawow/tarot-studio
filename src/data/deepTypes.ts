export type PositionKey = "present" | "cause" | "obstacle" | "advice" | "trend";
export const positionLabels: Record<PositionKey, string> = {
  present: "现状位",
  cause: "原因位",
  obstacle: "阻碍位",
  advice: "建议位",
  trend: "未来趋势位",
};
export const uprightLabels = {
  inner: "内在状态",
  outer: "外在处境",
  opportunity: "机会与挑战",
  strength: "积极表现",
  blindspot: "潜在盲点",
  misconception: "容易误解",
};
export const reversalLabels = {
  blocked: "能量受阻",
  excess: "表现过度",
  lacking: "表现不足",
  internal: "内在化",
  alternative: "情境中的另一种表现",
};
export interface TeachingCase {
  title: string;
  background: string;
  question: string;
  position: PositionKey;
  reversed: boolean;
  observation: string;
  symbolism: string;
  reasoning: string;
  interpretation: string;
  alternative: string;
  action: string;
}
export interface TeachingExercise {
  kind: "observation" | "reasoning" | "scenario";
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface DeepTeaching {
  story: string;
  visual: { detail: string; reading: string; bridge: string }[];
  upright: Record<keyof typeof uprightLabels, string>;
  reversed: Record<keyof typeof reversalLabels, string>;
  positions: Record<
    PositionKey,
    { question: string; meaning: string; example: string }
  >;
  contexts: Record<"love" | "work" | "social" | "growth", string>;
  cases: TeachingCase[];
  exercises: TeachingExercise[];
}
