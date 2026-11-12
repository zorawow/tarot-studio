import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cards } from "../data/cards";
import type {
  CardProgress,
  LearningState,
  PracticeRecord,
  ReadingDraft,
  TeachingProgress,
} from "../data/types";
import {
  addDays,
  blankCard,
  bump,
  dateKey,
  emptyState,
  migrateState,
  random,
  reviewUpdate,
  STORAGE_KEY,
} from "./learning";
type Context = {
  state: LearningState;
  error: string;
  updateCard: (id: string, patch: Partial<CardProgress>) => void;
  openCard: (id: string) => void;
  saveLesson: (id: string, response: string, complete?: boolean) => void;
  answer: (id: string, correct: boolean) => void;
  rate: (id: string, rating: number) => void;
  saveRecord: (record: PracticeRecord) => void;
  deleteRecord: (id: string) => void;
  replace: (data: unknown) => void;
  saveDraft: (draft: ReadingDraft | null) => void;
  saveTeaching: (id: string, patch: Partial<TeachingProgress>) => void;
  saveQuestionDraft: (original: string, selected: string) => void;
};
const LearningContext = createContext<Context | null>(null);
function withDaily(s: LearningState): LearningState {
  if (s.daily?.date !== dateKey())
    s.daily = {
      date: dateKey(),
      cardId: cards[Math.floor(random() * cards.length)].id,
    };
  return s;
}
export function LearningProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return {
        state: withDaily(raw ? migrateState(JSON.parse(raw)) : emptyState()),
        error: "",
      };
    } catch {
      return {
        state: withDaily(emptyState()),
        error:
          "本地学习数据未能读取。原数据已保留；请先到“我的进度”下载原始数据或导入有效备份，恢复前不会覆盖它。",
      };
    }
  });
  const [state, setState] = useState(initial.state);
  const [error, setError] = useState(initial.error);
  const [readBlocked, setReadBlocked] = useState(!!initial.error);
  const change = useCallback(
    (fn: (s: LearningState) => void) =>
      setState((old) => {
        const next = structuredClone(old);
        fn(next);
        return next;
      }),
    [],
  );
  useEffect(() => {
    if (readBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setError("");
    } catch {
      setError(
        "浏览器无法保存学习数据，当前改动只在本次打开期间保留。请到“我的进度”导出备份，检查浏览器存储空间或隐私设置。",
      );
    }
  }, [state, readBlocked]);
  useEffect(() => {
    const refresh = () => {
      change((s) => {
        if (s.daily?.date === dateKey()) return;
        s.daily = {
          date: dateKey(),
          cardId: cards[Math.floor(random() * cards.length)].id,
        };
      });
    };
    refresh();
    const timer = setInterval(() => {
      if (state.daily?.date !== dateKey()) refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [change, state.daily?.date]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        setState(migrateState(JSON.parse(e.newValue)));
        setError("");
      } catch {
        setError(
          "另一个标签页写入了无法识别的数据，请保留当前页面并导出备份。",
        );
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const context: Context = {
    state,
    error,
    updateCard: (id, patch) =>
      change((s) => {
        const p = s.cards[id] ?? blankCard();
        const statusChanged = patch.status && p.status !== patch.status;
        s.cards[id] = { ...p, ...patch, updatedAt: new Date().toISOString() };
        if (statusChanged) {
          if (p.status === "new" && patch.status !== "new") bump(s, "cards");
          s.cards[id].due =
            patch.status === "new"
              ? null
              : addDays(
                  dateKey(),
                  patch.status === "mastered"
                    ? 14
                    : patch.status === "familiar"
                      ? 3
                      : 1,
                );
        }
      }),
    openCard: useCallback(
      (id) =>
        change((s) => {
          s.recentCards = [id, ...s.recentCards.filter((x) => x !== id)].slice(
            0,
            8,
          );
        }),
      [change],
    ),
    saveLesson: (id, response, complete = false) =>
      change((s) => {
        const p = s.lessons[id];
        if (complete && !p?.completedAt) bump(s, "lessons");
        s.lessons[id] = {
          response,
          completedAt: complete
            ? p?.completedAt || new Date().toISOString()
            : p?.completedAt || null,
          updatedAt: new Date().toISOString(),
        };
        s.lastLessonId = id;
      }),
    answer: (id, correct) =>
      change((s) => {
        const p = s.cards[id] ?? blankCard();
        s.cards[id] = reviewUpdate(p, correct);
        if (p.status === "new") bump(s, "cards");
        s.quizTotals.attempts++;
        if (correct) s.quizTotals.correct++;
        bump(s, "quizzes");
      }),
    rate: (id, rating) =>
      change((s) => {
        const p = s.cards[id] ?? blankCard();
        p.interval =
          rating === 0
            ? 1
            : rating === 1
              ? Math.max(2, p.interval)
              : Math.min(60, Math.max(7, p.interval * 2));
        p.due = addDays(dateKey(), p.interval);
        if (p.status === "new") p.status = "learning";
        p.updatedAt = new Date().toISOString();
        s.cards[id] = p;
        bump(s, "cards");
      }),
    saveRecord: (r) =>
      change((s) => {
        const i = s.journal.findIndex((x) => x.id === r.id);
        if (i >= 0) s.journal[i] = r;
        else {
          s.journal.unshift(r);
          bump(s, "practices");
        }
      }),
    deleteRecord: (id) =>
      change((s) => {
        s.journal = s.journal.filter((x) => x.id !== id);
      }),
    saveDraft: (draft) =>
      change((s) => {
        s.readingDraft = draft;
      }),
    saveTeaching: (id, patch) =>
      change((s) => {
        s.teaching ??= {};
        s.teaching[id] = {
          ...(s.teaching[id] ?? {
            draft: "",
            reflection: "",
            revealedSteps: 0,
            answers: {},
            completedAt: null,
            recordId: null,
          }),
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      }),
    saveQuestionDraft: (original, selected) =>
      change((s) => {
        s.questionDraft = {
          original,
          selected,
          updatedAt: new Date().toISOString(),
        };
      }),
    replace: (data) => {
      const next = migrateState(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setReadBlocked(false);
      setError("");
    },
  };
  return (
    <LearningContext.Provider value={context}>
      {children}
    </LearningContext.Provider>
  );
}
export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error("LearningProvider is required");
  return value;
}
export function useToday() {
  const [day, setDay] = useState(dateKey());
  useEffect(() => {
    const timer = setInterval(() => setDay(dateKey()), 30000);
    return () => clearInterval(timer);
  }, []);
  return day;
}
