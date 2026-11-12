import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Layers3,
  Sparkles,
  Target,
  Brain,
  Feather,
} from "lucide-react";
import { CardArt, Emblem, ProgressBar, SectionTitle } from "../components";
import { cardById, cards } from "../data/cards";
import { lessons, lessonById, stages } from "../data/courses";
import { useLearning, useToday } from "../lib/store";
import { dueCards, streak } from "../lib/learning";
export function Dashboard() {
  const { state } = useLearning();
  const today = useToday();
  const learned = Object.values(state.cards).filter(
    (p) => p.status !== "new",
  ).length;
  const mastered = Object.values(state.cards).filter(
    (p) => p.status === "mastered",
  ).length;
  const due = dueCards(state, today);
  const next =
    lessons.find((l) => !state.lessons[l.id]?.completedAt) || lessons[0];
  const resume =
    state.lastLessonId && !state.lessons[state.lastLessonId]?.completedAt
      ? lessonById[state.lastLessonId] || next
      : next;
  const daily = cardById[state.daily?.cardId || "major-17"];
  const done = lessons.filter((l) => state.lessons[l.id]?.completedAt).length;
  const accuracy = state.quizTotals.attempts
    ? Math.round((state.quizTotals.correct / state.quizTotals.attempts) * 100)
    : null;
  return (
    <div className="dashboard page-enter">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR QUIET MOMENT OF DISCOVERY</div>
          <h1>
            欢迎回到，你的塔罗小宇宙<span className="greeting-star">✧</span>
          </h1>
          <p>留一点时间给自己。今天，也从一张牌开始。</p>
        </div>
        <div className="today-date">
          <span>
            {new Date(`${today}T12:00:00`).toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
          <span className="status-dot">安静学习，慢慢生长</span>
        </div>
      </div>
      <section className="beginner-roadmap panel">
        <div className="section-title">
          <h2>从零开始，今天走到哪一步？</h2>
          <Link className="text-link" to="/courses">
            完整学习路线 →
          </Link>
        </div>
        <div className="roadmap-steps">
          {stages.map((stage) => (
            <Link key={stage.id} to={`/courses?stage=${stage.id}`}>
              <span>{String(stage.order).padStart(2, "0")}</span>
              {stage.title}
            </Link>
          ))}
        </div>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-copy">
              <div className="pill">
                <span className="tiny-star">✦</span> 今日学习 · 约
                {resume.minutes}分钟
              </div>
              <h2>
                让直觉有依据，
                <br />
                让每一步都有<span>方向。</span>
              </h2>
              <p>
                {resume.title}
                <br />
                <span>{resume.subtitle}</span>
              </p>
              <Link to={`/courses/${resume.id}`} className="button primary">
                {state.lessons[resume.id]?.response
                  ? "继续这节课"
                  : "开始今日学习"}
                <ArrowRight size={16} />
              </Link>
              <div className="hero-footnote">
                <span className="mini-dots">✧</span>{" "}
                不必一次看懂全部，只需比昨天多理解一点。
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="orbit-star star-one">✧</span>
              <span className="orbit-star star-two">✦</span>
              <span className="orbit-star star-three">·</span>
              <CardArt
                card={cardById["major-2"]}
                className="fan-left"
                priority
              />
              <CardArt
                card={cardById["major-19"]}
                className="fan-right"
                priority
              />
              <CardArt
                card={cardById["major-17"]}
                className="fan-center"
                priority
              />
              <span className="art-caption">AS ABOVE, SO BELOW</span>
            </div>
          </section>
          <div className="metric-grid">
            <Link to="/progress" className="metric-card">
              <span className="metric-icon lavender">
                <Layers3 size={20} />
              </span>
              <div>
                <span className="metric-label">已认识的塔罗牌</span>
                <p>
                  <strong>{learned}</strong>
                  <span> / 78</span>
                </p>
                <small>
                  {mastered
                    ? `${mastered} 张已掌握`
                    : "每一次认识，都是新的连接"}
                </small>
              </div>
            </Link>
            <Link to="/progress" className="metric-card">
              <span className="metric-icon gold">
                <Flame size={20} />
              </span>
              <div>
                <span className="metric-label">连续学习</span>
                <p>
                  <strong>{streak(state, today)}</strong>
                  <span> 天</span>
                </p>
                <small>
                  {streak(state, today)
                    ? "小小坚持，正在累积"
                    : "今天可以成为第一天"}
                </small>
              </div>
            </Link>
            <Link to="/training" className="metric-card">
              <span className="metric-icon sage">
                <Target size={20} />
              </span>
              <div>
                <span className="metric-label">记忆测验正确率</span>
                <p>
                  <strong>{accuracy === null ? "—" : accuracy}</strong>
                  <span>{accuracy === null ? " 等待初次练习" : " %"}</span>
                </p>
                <small>
                  {state.quizTotals.attempts
                    ? `来自 ${state.quizTotals.attempts} 次真实答题`
                    : "用练习，发现理解的盲点"}
                </small>
              </div>
            </Link>
          </div>
          <section className="learning-path-section">
            <SectionTitle
              title="循着自己的节奏，慢慢学"
              sub="从认识一副牌，到说出自己的理解"
              to="/courses"
              label="完整学习路径"
            />
            <div className="path-grid">
              {stages.slice(0, 3).map((stage, i) => {
                const group = lessons.filter((l) => l.stageId === stage.id);
                const n = group.filter(
                  (l) => state.lessons[l.id]?.completedAt,
                ).length;
                return (
                  <Link
                    key={stage.id}
                    to={`/courses?stage=${stage.id}`}
                    className={`path-card path-${i}`}
                  >
                    <div className="path-card-top">
                      <span>阶段 {String(stage.order).padStart(2, "0")}</span>
                      <span className="path-glyph">{stage.icon}</span>
                    </div>
                    <h3>{stage.title}</h3>
                    <p>{stage.subtitle}</p>
                    <ProgressBar
                      value={(n / group.length) * 100}
                      label={`${stage.title}课程进度`}
                    />
                    <div className="path-card-bottom">
                      <span>
                        {n} / {group.length} 节已完成
                      </span>
                      {n === group.length ? (
                        <Check size={15} />
                      ) : (
                        <ArrowRight size={15} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          <section>
            <SectionTitle title="把知识，变成自己的理解" />
            <div className="practice-links">
              <Link to="/training" className="practice-link">
                <span className="practice-icon">
                  <Brain size={26} strokeWidth={1.4} />
                </span>
                <div>
                  <h3>给记忆一点练习</h3>
                  <p>
                    {due.length
                      ? `${due.length} 张牌等待复习，巩固刚刚好的记忆。`
                      : "翻一张卡，认一个符号，让理解留下来。"}
                  </p>
                  <span>
                    {due.length ? "开始今日复习" : "开始记忆训练"}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
              <Link to="/lab" className="practice-link">
                <span className="practice-icon">
                  <Sparkles size={26} strokeWidth={1.4} />
                </span>
                <div>
                  <h3>在牌之间，看见故事</h3>
                  <p>先写自己的观察，再与参考思路相遇。</p>
                  <span>
                    走进解牌实验室
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="daily-card-panel panel">
            <div className="daily-top">
              <span className="eyebrow">CARD OF THE DAY</span>
              <Sparkles size={17} />
            </div>
            <h2>今日的一张牌</h2>
            <p className="daily-subtitle">一个观察世界的新角度</p>
            <Link
              to={`/cards/${daily.id}`}
              className="daily-image-link"
              aria-label={`学习今日牌：${daily.name}`}
            >
              <CardArt card={daily} priority />
              <div className="daily-glow" />
            </Link>
            <div className="daily-numeral">
              {daily.numeral} ·{" "}
              {daily.suit === "major"
                ? "MAJOR ARCANA"
                : daily.english.split(" of ")[1].toUpperCase()}
            </div>
            <h3>{daily.name}</h3>
            <span className="daily-english">{daily.english}</span>
            <div className="tag-row">
              {daily.keywords.slice(0, 3).map((k) => (
                <span key={k}>{k}</span>
              ))}
            </div>
            <p className="daily-description">
              {daily.memory} {daily.upright.split("。")[0]}。
            </p>
            <Link className="button secondary full" to={`/cards/${daily.id}`}>
              认识这张牌
              <ArrowUpRight size={15} />
            </Link>
            <span className="daily-note">每日更新的学习卡，不是运势预告</span>
          </section>
          <section className="quiet-note">
            <Feather size={21} />
            <blockquote>
              牌面是一扇窗，
              <br />
              理解来自你的观察。
            </blockquote>
            <p>
              先问「我看到了什么」，
              <br />
              再问「它可能意味着什么」。
            </p>
            <Link to="/journal">
              留下一点今天的想法 <ArrowRight size={13} />
            </Link>
          </section>
        </aside>
      </div>
      <section className="recent-section">
        <SectionTitle
          title="继续留下你的学习足迹"
          sub={`${done} 节课程已完成，每一次练习都会被记下`}
          to="/journal"
          label="打开学习日记"
        />
        {state.recentCards.length || state.lastLessonId ? (
          <div className="recent-grid">
            {state.lastLessonId && lessonById[state.lastLessonId] && (
              <Link
                className="recent-item"
                to={`/courses/${state.lastLessonId}`}
              >
                <BookOpen size={19} />
                <div>
                  <span>上次的课程</span>
                  <strong>{lessonById[state.lastLessonId].title}</strong>
                </div>
                <ArrowRight size={16} />
              </Link>
            )}
            {state.recentCards.slice(0, 2).map((id) => (
              <Link key={id} className="recent-item" to={`/cards/${id}`}>
                <CardArt card={cardById[id]} />
                <div>
                  <span>最近读过的牌</span>
                  <strong>{cardById[id].name}</strong>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="first-footprint">
            <Emblem />
            <div>
              <h3>你的第一步，会从这里被记住</h3>
              <p>读一张牌、完成一节课，或写下一次独立解读。</p>
            </div>
            <Link to={`/courses/${lessons[0].id}`} className="text-link">
              踏上学习旅程
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
