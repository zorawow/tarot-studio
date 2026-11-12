export type Suit = "major" | "wands" | "cups" | "swords" | "pentacles";
export type StudyStatus = "new" | "learning" | "familiar" | "mastered";
export interface TarotCard {
  id: string;
  name: string;
  english: string;
  number: number;
  numeral: string;
  suit: Suit;
  keywords: string[];
  story: string;
  symbols: { name: string; meaning: string }[];
  upright: string;
  reversed: string;
  contexts: { love: string; social: string; work: string; growth: string };
  compare: { id: string; difference: string }[];
  memory: string;
  prompt: string;
  imageFile: string;
}
export interface Lesson {
  id: string;
  stageId: string;
  title: string;
  subtitle: string;
  minutes: number;
  sections: { title: string; text: string }[];
  cardIds: string[];
  exercise: string;
  example: string;
}
export interface Stage {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}
export interface CardProgress {
  status: StudyStatus;
  favorite: boolean;
  note: string;
  updatedAt: string;
  correct: number;
  attempts: number;
  lapses: number;
  interval: number;
  due: string | null;
}
export interface LessonProgress {
  completedAt: string | null;
  response: string;
  updatedAt: string;
}
export interface DrawnCard {
  cardId: string;
  reversed: boolean;
  position: string;
}
export type PracticeKind = "reading" | "reflection";
export interface PracticeRecord {
  id: string;
  kind: PracticeKind;
  createdAt: string;
  updatedAt: string;
  date: string;
  title: string;
  question: string;
  spreadId: string;
  cards: DrawnCard[];
  interpretation: string;
  reference: string;
  reflection: string;
  tags: string[];
  lessonId?: string;
}
export interface DayActivity {
  cards: number;
  quizzes: number;
  lessons: number;
  practices: number;
}
export interface ReadingDraft {
  question: string;
  spreadId: string;
  withReversals: boolean;
  cards: DrawnCard[];
  flipped: string[];
  interpretation: string;
  reflection: string;
  referenceVisible: boolean;
  referenceViewed?: boolean;
  deck?: { cardId: string; reversed: boolean }[];
  selectedIndices?: number[];
  readingNotes?: {
    observation: string;
    symbols: string;
    context: string;
    connections: string;
  };
  hintLevel?: number;
  recordId: string | null;
}
export interface TeachingProgress {
  draft: string;
  reflection: string;
  revealedSteps: number;
  answers: Record<string, number>;
  completedAt: string | null;
  updatedAt: string;
  recordId: string | null;
}
export interface LearningState {
  schemaVersion: 1;
  cards: Record<string, CardProgress>;
  lessons: Record<string, LessonProgress>;
  journal: PracticeRecord[];
  activity: Record<string, DayActivity>;
  lastLessonId: string | null;
  recentCards: string[];
  daily: { date: string; cardId: string } | null;
  quizTotals: { correct: number; attempts: number };
  readingDraft: ReadingDraft | null;
  teaching?: Record<string, TeachingProgress>;
  questionDraft?: { original: string; selected: string; updatedAt: string };
}
