import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Search,
  Sparkles,
  Brain,
} from "lucide-react";
import { CardArt, Empty, PageTitle, Saved } from "../components";
import { cards, cardById, statusLabels, suitInfo } from "../data/cards";
import type { StudyStatus, Suit } from "../data/types";
import { DeepCardLesson } from "../Teaching";
import { blankCard } from "../lib/learning";
import { useLearning } from "../lib/store";
export function LibraryPage() {
  const { state } = useLearning();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    suit = params.get("suit") || "all",
    status = params.get("status") || "all",
    favorites = params.get("favorite") === "1";
  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value && value !== "all") p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );
  const filtered = cards.filter((c) => {
    const p = state.cards[c.id] ?? blankCard();
    return (
      (suit === "all" ||
        (suit === "minor" ? c.suit !== "major" : c.suit === suit)) &&
      (status === "all" || p.status === status) &&
      (!favorites || p.favorite) &&
      [c.name, c.english, ...c.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q.trim().toLowerCase())
    );
  });
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="THE CARD LIBRARY"
        title="78张牌，78种看见"
        description="从画面走入含义，让关键词成为理解的起点。"
      >
        <span className="count-label">韦特塔罗 · RWS 1909</span>
      </PageTitle>
      <div className="library-toolbar panel">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="搜索塔罗牌"
            placeholder="搜索牌名、英文名或关键词…"
            value={q}
            onChange={(e) => set("q", e.target.value)}
          />
        </label>
        <label className="select-field">
          <span>学习状态</span>
          <select
            aria-label="筛选学习状态"
            value={status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="all">全部状态</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`button secondary ${favorites ? "selected" : ""}`}
          onClick={() => set("favorite", favorites ? "" : "1")}
          aria-pressed={favorites}
        >
          <Bookmark size={15} fill={favorites ? "currentColor" : "none"} />
          只看收藏
        </button>
      </div>
      <div className="filter-tabs" aria-label="牌组筛选">
        {[
          ["all", "全部牌组", "78"],
          ["major", "大阿尔卡那", "22"],
          ["wands", "权杖", "14"],
          ["cups", "圣杯", "14"],
          ["swords", "宝剑", "14"],
          ["pentacles", "星币", "14"],
        ].map(([id, name, n]) => (
          <button
            key={id}
            className={suit === id ? "active" : ""}
            onClick={() => set("suit", id)}
            aria-pressed={suit === id}
          >
            {name}
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="results-label">
        <span>
          共找到 <strong>{filtered.length}</strong> 张牌
        </span>
        <span>观察 · 理解 · 联结</span>
      </div>
      {filtered.length ? (
        <div className="card-grid">
          {filtered.map((c) => {
            const p = state.cards[c.id] ?? blankCard();
            return (
              <Link className="library-card" key={c.id} to={`/cards/${c.id}`}>
                <div className="library-card-image">
                  <CardArt card={c} />
                  {p.favorite && (
                    <span className="favorite-mark">
                      <Bookmark size={15} fill="currentColor" />
                    </span>
                  )}
                  <span className="card-hover-label">
                    走进这张牌 <ArrowRight size={15} />
                  </span>
                </div>
                <div className="library-card-meta">
                  <span className="card-category">
                    {c.numeral} · {suitInfo[c.suit].name}
                  </span>
                  <h2>{c.name}</h2>
                  <span className="card-english">{c.english}</span>
                  <p>{c.keywords.slice(0, 3).join(" · ")}</p>
                  <span className={`study-badge status-${p.status}`}>
                    {p.status === "mastered" && <Check size={11} />}{" "}
                    {statusLabels[p.status]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty
          title="暂时没有匹配的牌"
          description="试试另一个关键词，或调整牌组与学习状态。"
        >
          <button className="button secondary" onClick={() => setParams({})}>
            清除筛选
          </button>
        </Empty>
      )}
    </div>
  );
}
export function CardDetail() {
  const { id = "" } = useParams();
  const c = cardById[id];
  const { state, updateCard, openCard, error } = useLearning();
  const [reversed, setReversed] = useState(false);
  useEffect(() => {
    if (c) openCard(c.id);
    setReversed(false);
  }, [id, openCard, c]);
  if (!c)
    return (
      <Empty title="没有找到这张牌" description="请从完整的牌库重新选择。">
        <Link className="button primary" to="/cards">
          返回牌库
        </Link>
      </Empty>
    );
  const p = state.cards[c.id] ?? blankCard(),
    index = cards.findIndex((x) => x.id === id);
  return (
    <div className="page-enter">
      <Link to="/cards" className="back-link">
        <ArrowLeft size={15} />
        返回78张牌
      </Link>
      <div className="card-detail-grid">
        <aside className="detail-visual">
          <div className="detail-art-wrap">
            <div className="detail-halo" />
            <CardArt card={c} reversed={reversed} priority />
          </div>
          <div className="segmented">
            <button
              className={!reversed ? "active" : ""}
              onClick={() => setReversed(false)}
              aria-pressed={!reversed}
            >
              正位 Upright
            </button>
            <button
              className={reversed ? "active" : ""}
              onClick={() => setReversed(true)}
              aria-pressed={reversed}
            >
              逆位 Reversed
            </button>
          </div>
          <p className="image-attribution">
            Pamela Colman Smith · 原始 RWS 牌面
            <br />
            公版扫描 · Steve P.
            <br />
            <a
              href="https://github.com/mixvlad/TarotCards/blob/main/SOURCES.md"
              target="_blank"
              rel="noreferrer"
            >
              扫描出处与公版说明 ↗
            </a>
          </p>
          <div className="detail-learning panel">
            <h3>把这张牌留在记忆里</h3>
            <label className="field">
              学习状态
              <select
                value={p.status}
                aria-label="设置学习状态"
                onChange={(e) =>
                  updateCard(id, { status: e.target.value as StudyStatus })
                }
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`button secondary full ${p.favorite ? "selected" : ""}`}
              onClick={() => updateCard(id, { favorite: !p.favorite })}
            >
              <Bookmark size={15} fill={p.favorite ? "currentColor" : "none"} />
              {p.favorite ? "已收藏，点击取消" : "收藏这张牌"}
            </button>
            <Link className="button primary full" to={`/training?card=${id}`}>
              <Brain size={16} />
              练习这张牌
            </Link>
            {p.due && <small className="muted">下次复习：{p.due}</small>}
          </div>
        </aside>
        <article className="detail-content">
          <div className="eyebrow">
            {c.numeral} · {suitInfo[c.suit].english.toUpperCase()} ·{" "}
            {suitInfo[c.suit].element}
          </div>
          <h1>
            {c.name}
            <span>{c.english}</span>
          </h1>
          <div className="tag-row detail-tags">
            {c.keywords.map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
          <div className="memory-line">
            <Sparkles size={19} />
            <span>{c.memory}</span>
          </div>
          <DeepCardLesson key={c.id} card={c} reversed={reversed} />
          <section className="reflection-panel panel">
            <div className="section-title">
              <h2>
                <NotebookPen size={18} />
                我的观察与笔记
              </h2>
              {p.note && !error && <Saved text="已保存在此浏览器" />}
            </div>
            <p className="reflection-prompt">{c.prompt}</p>
            <textarea
              aria-label="个人牌义笔记"
              placeholder="先记下看见的细节，再写你的联想和日常例子…"
              value={p.note}
              maxLength={10000}
              onChange={(e) => updateCard(id, { note: e.target.value })}
            />
            <div className="note-footer">
              <small>你的个人理解会独立保存，不覆盖课程知识。</small>
              {p.status === "new" && (
                <button
                  className="text-link"
                  onClick={() => updateCard(id, { status: "learning" })}
                >
                  <Check size={14} />
                  标记已开始学习
                </button>
              )}
            </div>
          </section>
          <div className="detail-pagination">
            {index > 0 ? (
              <Link className="text-link" to={`/cards/${cards[index - 1].id}`}>
                <ChevronLeft size={15} />
                {cards[index - 1].name}
              </Link>
            ) : (
              <span />
            )}
            {index < cards.length - 1 && (
              <Link className="text-link" to={`/cards/${cards[index + 1].id}`}>
                {cards[index + 1].name}
                <ChevronRight size={15} />
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
