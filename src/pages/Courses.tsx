import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Layers3,
  MessageCircle,
} from "lucide-react";
import {
  CardArt,
  Empty,
  Notice,
  PageTitle,
  ProgressBar,
  Saved,
} from "../components";
import { cardById, cards } from "../data/cards";
import { questionExamples } from "../data/academy";
import { ProcessGuide } from "./FirstReading";
import { lessons, lessonById, stages } from "../data/courses";
import { useLearning } from "../lib/store";
import "../academy.css";

const academyPaths = [
  {
    id: "lessons",
    label: `${lessons.length} 节微课程`,
    description: "从认识塔罗到独立解读，每节约 5–10 分钟。",
    to: "/courses/lessons",
    icon: BookOpen,
  },
  {
    id: "library",
    label: `${cards.length} 张牌库`,
    description: "查阅韦特塔罗的图像、正逆位含义与解读案例。",
    to: "/cards",
    icon: Layers3,
  },
  {
    id: "questions",
    label: "提问练习",
    description: "用自己的问题练习改写，找到更清晰的探索方向。",
    to: "/questions",
    icon: MessageCircle,
  },
];

export function Academy() {
  const { search } = useLocation();
  if (new URLSearchParams(search).has("stage")) {
    return <Navigate to={{ pathname: "/courses/lessons", search }} replace />;
  }

  return (
    <div className="academy-hub page-enter">
      <header className="academy-heading">
        <h1>塔罗学院</h1>
        <p>初次学习可以从微课程开始。</p>
      </header>
      <nav className="academy-paths" aria-label="塔罗学院">
        {academyPaths.map(({ id, label, description, to, icon: Icon }) => (
          <Link
            key={id}
            className="academy-path panel"
            to={to}
            aria-labelledby={`academy-${id}-label`}
            aria-describedby={`academy-${id}-description`}
          >
            <Icon className="academy-path-icon" size={25} aria-hidden="true" />
            <div>
              <h2 id={`academy-${id}-label`}>{label}</h2>
              <p id={`academy-${id}-description`}>{description}</p>
            </div>
            <ArrowRight
              className="academy-path-arrow"
              size={18}
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Courses() {
  const { state } = useLearning();
  const [params, setParams] = useSearchParams();
  const active =
    stages.find(
      (s) =>
        s.id ===
        ((
          {
            foundations: "academy-intro",
            "minor-patterns": "major-journey",
          } as Record<string, string>
        )[params.get("stage") || ""] || params.get("stage")),
    ) ||
    stages.find((s) =>
      lessons.some(
        (l) => l.stageId === s.id && !state.lessons[l.id]?.completedAt,
      ),
    ) ||
    stages[0];
  const done = lessons.filter((l) => state.lessons[l.id]?.completedAt).length;
  const group = lessons.filter((l) => l.stageId === active.id);
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="塔罗学院"
        title="微课程"
        description="从看懂牌面、提出清晰的问题，到独立解读。每节课约 5–10 分钟。"
      />
      <div className="course-overview panel">
        <div className="course-overview-icon">✧</div>
        <div>
          <h2>课程进度</h2>
          <ProgressBar
            value={(done / lessons.length) * 100}
            label="课程整体完成度"
          />
          <Link className="text-link academy-progress-link" to="/progress">
            查看学习进度
          </Link>
        </div>
        <div className="course-total">
          <strong>
            {done}
            <span> / {lessons.length}</span>
          </strong>
          <span>节微课程已完成</span>
        </div>
      </div>
      <div className="courses-layout">
        <nav className="stage-nav" aria-label="学习阶段">
          {stages.map((s) => {
            const n = lessons.filter(
              (l) => l.stageId === s.id && state.lessons[l.id]?.completedAt,
            ).length;
            const total = lessons.filter((l) => l.stageId === s.id).length;
            return (
              <button
                className={active.id === s.id ? "active" : ""}
                key={s.id}
                onClick={() => setParams({ stage: s.id })}
              >
                <span className="stage-number">
                  {n === total ? (
                    <Check size={18} />
                  ) : (
                    String(s.order).padStart(2, "0")
                  )}
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    {n} / {total} 节已完成
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </nav>
        <div className="stage-content">
          <div className="eyebrow">
            STAGE {String(active.order).padStart(2, "0")} · {active.subtitle}
          </div>
          <h2>{active.title}</h2>
          <p>{active.description}</p>
          <div className="lesson-list">
            {group.map((l, i) => {
              const completed = !!state.lessons[l.id]?.completedAt;
              return (
                <Link
                  key={l.id}
                  to={`/courses/${l.id}`}
                  className="lesson-list-item panel"
                >
                  <span
                    className={`lesson-index ${completed ? "complete" : ""}`}
                  >
                    {completed ? (
                      <Check size={20} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <h3>{l.title}</h3>
                    <p>{l.subtitle}</p>
                    <div className="lesson-metadata">
                      <span>
                        <Clock3 size={13} />
                        {l.minutes}分钟
                      </span>
                      <span>
                        <BookOpen size={13} />
                        {l.sections.length}个学习片段
                      </span>
                      {state.lessons[l.id]?.response && (
                        <span>{completed ? "已完成" : "练习已暂存"}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              );
            })}
          </div>
          <Notice>
            所有阶段都可以自由进入。推荐顺序只是学习支架；遇到不熟悉的牌，可以先回到牌库和记忆训练。
          </Notice>
        </div>
      </div>
    </div>
  );
}
export function LessonPage() {
  const { id = "" } = useParams();
  const lesson = lessonById[id];
  const { state, saveLesson, error } = useLearning();
  const [showExample, setShowExample] = useState(false);
  if (!lesson)
    return (
      <Empty title="没有找到这节课" description="回到学习路径选择一节微课程。">
        <Link to="/courses/lessons" className="button primary">
          返回微课程
        </Link>
      </Empty>
    );
  const p = state.lessons[id];
  const stage = stages.find((s) => s.id === lesson.stageId)!;
  const index = lessons.findIndex((l) => l.id === id);
  const next = lessons[index + 1];
  return (
    <div className="lesson-page page-enter" key={id}>
      <Link className="back-link" to={`/courses/lessons?stage=${stage.id}`}>
        <ArrowLeft size={15} />
        返回{stage.title}
      </Link>
      <PageTitle
        eyebrow={`STAGE ${stage.order} · ${stage.title}`}
        title={lesson.title}
        description={lesson.subtitle}
      >
        <span className="lesson-time">
          <Clock3 size={15} />
          {lesson.minutes}分钟 · {p?.completedAt ? "已完成" : "微课程"}
        </span>
      </PageTitle>
      <div className="lesson-reading panel">
        {lesson.sections.map((s, i) => (
          <section key={s.title}>
            <span className="reading-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </section>
        ))}
      </div>
      {id === "academy-questions" && (
        <section className="panel question-workbench">
          <h2>从不理想到更清晰：{questionExamples.length}组提问案例</h2>
          <div className="question-example-list">
            {questionExamples.map((example, i) => (
              <details key={i}>
                <summary>
                  {i + 1}. {example.before}
                </summary>
                <span className="card-category">{example.domain}</span>
                <p>
                  <b>优化后：</b>
                  {example.after}
                </p>
                <p>
                  <b>为什么：</b>
                  {example.reason}
                </p>
              </details>
            ))}
          </div>
          <Link className="button primary" to="/questions">
            轮到你了：优化自己的问题
            <ArrowRight size={16} />
          </Link>
        </section>
      )}
      {["academy-question-practice", "clear-questions"].includes(id) && (
        <div className="learning-links">
          <Link to="/questions">立即进入互动式问题优化训练 →</Link>
        </div>
      )}
      {id === "academy-process" && <ProcessGuide />}
      {["academy-process", "guided-first-reading"].includes(id) && (
        <div className="lesson-next-action panel">
          <h2>让知识变成一次完整练习</h2>
          <p>用固定教学案例走完十步，先写下自己的解释，再对照老师的分析。</p>
          <Link className="button primary" to="/first-reading">
            跟着老师完成第一次解读
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {lesson.cardIds.length > 0 && (
        <section className="lesson-related">
          <h2>边学边看，走进这些牌</h2>
          <div className="related-card-row">
            {lesson.cardIds.map((cid) => (
              <Link key={cid} to={`/cards/${cid}`}>
                <CardArt card={cardById[cid]} />
                <span>{cardById[cid].name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="lesson-exercise panel">
        <div className="eyebrow">A LITTLE PRACTICE</div>
        <h2>停一下，把理解写出来</h2>
        <p>{lesson.exercise}</p>
        <label className="field">
          我的练习
          <textarea
            value={p?.response || ""}
            aria-label="课程练习回答"
            maxLength={10000}
            placeholder="用你自己的语言写下观察与思路，不需要与参考答案一模一样…"
            onChange={(e) => saveLesson(id, e.target.value)}
          />
        </label>
        <div className="exercise-toolbar">
          {p?.response && !error ? (
            <Saved text="练习已自动保存" />
          ) : (
            <span className="muted">至少写下5个字，再标记完成</span>
          )}
          <button
            className="text-link"
            onClick={() => setShowExample((v) => !v)}
            aria-expanded={showExample}
          >
            <Eye size={15} />
            {showExample ? "收起参考思路" : "看看参考思路"}
          </button>
        </div>
        {showExample && (
          <div className="reference-box">
            <strong>一种参考思路</strong>
            <p>{lesson.example}</p>
          </div>
        )}
        <div className="lesson-complete-row">
          <button
            className="button primary"
            disabled={(p?.response.trim().length || 0) < 5 || !!p?.completedAt}
            onClick={() => saveLesson(id, p?.response || "", true)}
          >
            <CheckCircle2 size={17} />
            {p?.completedAt ? "这节课已完成" : "完成练习，标记本节课"}
          </button>
          {p?.completedAt && next && (
            <Link
              className="button secondary"
              to={`/courses/${next.id}`}
              onClick={() => setShowExample(false)}
            >
              下一节：{next.title}
              <ArrowRight size={15} />
            </Link>
          )}
          {p?.completedAt && !next && (
            <Link className="button secondary" to="/lab">
              去做一次独立解牌
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
