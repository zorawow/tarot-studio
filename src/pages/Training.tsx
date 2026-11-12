import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  X,
  Eye,
} from "lucide-react";
import { CardArt, Empty, Notice, PageTitle, ProgressBar } from "../components";
import { cards, cardById, suitInfo } from "../data/cards";
import type { TarotCard } from "../data/types";
import {
  dueCards,
  makeQuestions,
  quizModes,
  shuffle,
  weakCards,
  type Question,
  type QuizMode,
} from "../lib/learning";
import { useLearning } from "../lib/store";
export function Training() {
  const { state, answer, rate } = useLearning();
  const [params] = useSearchParams();
  const target = cardById[params.get("card") || ""];
  const [scope, setScope] = useState(params.get("scope") || "all");
  const [mode, setMode] = useState<QuizMode>("name");
  const [type, setType] = useState<"quiz" | "flash">("quiz");
  const [session, setSession] = useState<{
    questions: Question[];
    deck: TarotCard[];
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);
  const due = dueCards(state),
    weak = weakCards(state);
  const pool = target
    ? [target]
    : scope === "weak"
      ? weak
      : scope === "due"
        ? due
        : cards.filter(
            (c) =>
              scope === "all" ||
              (scope === "learned"
                ? !!state.cards[c.id] && state.cards[c.id].status !== "new"
                : c.suit === scope),
          );
  const start = () => {
    const batch =
      scope === "due" || scope === "weak" ? pool.slice(0, 10) : pool;
    setSession({
      questions: makeQuestions(batch, mode),
      deck: shuffle(batch).slice(0, 10),
    });
    setIndex(0);
    setSelected(null);
    setRight(0);
    setFinished(false);
    setRevealed(false);
    setRated(false);
  };
  const reset = () => {
    setSession(null);
    setFinished(false);
  };
  const total = session
    ? type === "quiz"
      ? session.questions.length
      : session.deck.length
    : 0;
  const next = () => {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setRated(false);
  };
  const choose = (n: number) => {
    if (selected !== null || !session) return;
    const q = session.questions[index];
    setSelected(n);
    const ok = n === q.answer;
    if (ok) setRight((x) => x + 1);
    answer(q.cardId, ok);
  };
  if (session && finished)
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="A LITTLE STRONGER IN MEMORY"
          title="今天的练习，已经留下痕迹"
          description="记住的不只是答案，还有你解释它的方式。"
        />
        <div className="result-panel panel">
          <div className="result-emblem">
            <CheckCircle2 size={48} strokeWidth={1.2} />
          </div>
          <h2>
            {type === "quiz"
              ? `答对 ${right} / ${total} 题`
              : `复习了 ${total} 张牌`}
          </h2>
          <p>
            {type === "quiz"
              ? right === total
                ? "这次很熟悉。下次可以试试正逆位与情境训练。"
                : "答错的牌会更早回来，熟悉的牌会逐步延长复习间隔。"
              : "你对熟悉程度的自评已用于安排下一次复习。"}
          </p>
          <div className="result-actions">
            <button className="button primary" onClick={reset}>
              选择下一组
              <ArrowRight size={16} />
            </button>
            <Link to="/progress" className="button secondary">
              查看复习计划
            </Link>
          </div>
        </div>
        <Notice>
          自评与测验用于安排记忆练习；正确率只代表课程知识记忆，不代表预测能力。
        </Notice>
      </div>
    );
  const q = session?.questions[index];
  const flash = session?.deck[index];
  return (
    <div className="training-page page-enter">
      <PageTitle
        eyebrow="PRACTICE & REMEMBER"
        title={session ? "给记忆一点时间" : "让理解，在练习中留下来"}
        description={
          target
            ? `正在练习：${target.name} · ${target.english}`
            : "每次最多10张牌。先回想，再看解释，让记忆有机会生长。"
        }
      />
      {!session ? (
        <>
          <div className="training-config panel">
            <div className="training-type">
              <button
                className={type === "quiz" ? "active" : ""}
                onClick={() => setType("quiz")}
              >
                <Brain size={20} />
                <strong>知识测验</strong>
                <span>即时判题，理解原因</span>
              </button>
              <button
                className={type === "flash" ? "active" : ""}
                onClick={() => setType("flash")}
              >
                <RotateCcw size={20} />
                <strong>记忆卡片</strong>
                <span>主动回想，自评熟悉度</span>
              </button>
            </div>
            <div className="config-body">
              <h2>今天想怎么练？</h2>
              {type === "quiz" && (
                <div className="mode-grid">
                  {Object.entries(quizModes).map(([key, label], i) => (
                    <button
                      key={key}
                      className={mode === key ? "active" : ""}
                      onClick={() => setMode(key as QuizMode)}
                      aria-pressed={mode === key}
                    >
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {label}
                      {mode === key && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
              <label className="field">
                选择练习范围
                <select
                  aria-label="选择测验范围"
                  disabled={!!target}
                  value={target ? "single" : scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {target ? (
                    <option value="single">{target.name}</option>
                  ) : (
                    <>
                      <option value="all">全部78张牌</option>
                      <option value="major">22张大阿尔卡那</option>
                      {Object.entries(suitInfo)
                        .filter(([k]) => k !== "major")
                        .map(([k, s]) => (
                          <option key={k} value={k}>
                            {s.name} · {s.english}
                          </option>
                        ))}
                      <option value="learned">已学习的牌</option>
                      <option value="weak">薄弱牌（{weak.length}张）</option>
                      <option value="due">到期复习（{due.length}张）</option>
                    </>
                  )}
                </select>
              </label>
              <div className="start-training-row">
                <p>
                  {pool.length
                    ? `本范围 ${pool.length} 张牌，本次练习 ${Math.min(10, pool.length)} 张`
                    : "此范围暂无卡牌，请先学习几张牌或调整范围。"}
                </p>
                <button
                  className="button primary"
                  onClick={start}
                  disabled={!pool.length}
                >
                  开始{type === "quiz" ? "测验" : "翻卡练习"}
                  <ArrowRight size={16} />
                </button>
              </div>
              {target && (
                <Link className="text-link" to="/training">
                  改为练习全部牌组
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
          <div className="review-explainer">
            <Sparkles size={21} />
            <div>
              <h3>在刚要忘记时，再遇见一次</h3>
              <p>
                首次答对后约1天复习，再逐步到3天、6天及更久；答错后回到1天。你也可以按“还不熟／有印象／记住了”调整。到期卡与经常答错的牌会出现在复习中心。
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="quiz-progress">
            <button className="text-link" onClick={reset}>
              <ChevronLeft size={15} />
              退出本组
            </button>
            <span>
              {index + 1} / {total}
            </span>
            <span>{type === "quiz" ? quizModes[mode] : "记忆卡片"}</span>
          </div>
          <ProgressBar value={(index / total) * 100} label="本次练习进度" />
          {type === "quiz" && q ? (
            <div className="question-panel panel" key={q.id}>
              <div className="question-content">
                {q.showImage && (
                  <div className="quiz-image">
                    <CardArt
                      card={cardById[q.cardId]}
                      reversed={q.reversed}
                      hideName={mode === "name"}
                      priority
                    />
                  </div>
                )}
                <div className="question-copy">
                  <div className="eyebrow">
                    QUESTION {String(index + 1).padStart(2, "0")}
                  </div>
                  <h2>{q.title}</h2>
                  <div className="answer-options">
                    {q.options.map((option, n) => (
                      <button
                        key={option}
                        className={`answer-option ${selected === null ? "" : n === q.answer ? "correct" : n === selected ? "incorrect" : "dimmed"}`}
                        onClick={() => choose(n)}
                        disabled={selected !== null}
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + n)}
                        </span>
                        <span>{option}</span>
                        {selected !== null && n === q.answer && (
                          <Check size={18} />
                        )}
                        {selected === n && n !== q.answer && <X size={18} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {selected !== null && (
                <div
                  className={`answer-feedback ${selected === q.answer ? "is-correct" : "is-incorrect"}`}
                  role="status"
                >
                  <h3>
                    {selected === q.answer ? (
                      <>
                        <CheckCircle2 size={18} />
                        回答正确
                      </>
                    ) : (
                      <>
                        <Brain size={18} />
                        这张牌值得再看一次
                      </>
                    )}
                  </h3>
                  <p>
                    <strong>正确答案：</strong>
                    {q.options[q.answer]}
                  </p>
                  <p>{q.explanation}</p>
                  <div className="feedback-actions">
                    <Link to={`/cards/${q.cardId}`} className="text-link">
                      回看这张牌
                      <ArrowRight size={14} />
                    </Link>
                    <button className="button primary" onClick={next}>
                      {index + 1 === total ? "查看本次结果" : "下一题"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            flash && (
              <div className="flash-panel panel">
                <div className="eyebrow">RECALL BEFORE REVEAL</div>
                <h2>先试着回想名字与三个关键词</h2>
                <button
                  className={`flash-card-button ${revealed ? "revealed" : ""}`}
                  onClick={() => setRevealed(!revealed)}
                  aria-label={revealed ? "收起牌义" : "翻卡查看牌义"}
                >
                  <CardArt card={flash} hideName={!revealed} priority />
                </button>
                {revealed ? (
                  <div className="flash-answer">
                    <h3>
                      {flash.name} <span>{flash.english}</span>
                    </h3>
                    <div className="tag-row">
                      {flash.keywords.map((k) => (
                        <span key={k}>{k}</span>
                      ))}
                    </div>
                    <p>{flash.memory}</p>
                    <p>{flash.upright}</p>
                    <Link className="text-link" to={`/cards/${flash.id}`}>
                      看看完整知识
                      <ArrowRight size={14} />
                    </Link>
                    <h4>刚刚的回想有多清楚？</h4>
                    <div className="rating-buttons">
                      {["还不熟", "有印象", "记住了"].map((label, n) => (
                        <button
                          className="button secondary"
                          disabled={rated}
                          key={label}
                          onClick={() => {
                            rate(flash.id, n);
                            setRated(true);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {rated && (
                      <button className="button primary" onClick={next}>
                        {index + 1 === total ? "完成本组" : "下一张牌"}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="button secondary"
                    onClick={() => setRevealed(true)}
                  >
                    <Eye size={16} />
                    看看牌义
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
