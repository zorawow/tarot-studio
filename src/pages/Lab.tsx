import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  Feather,
  RotateCcw,
  Shuffle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CardArt, Confirm, Notice, PageTitle, Saved } from "../components";
import { cardById } from "../data/cards";
import type { ReadingDraft } from "../data/types";
import { dateKey, spreads, recordId } from "../lib/learning";
import {
  blankReadingNotes,
  combinedInterpretation,
  createDeck,
  referenceAtLevel,
  selectDeckCard,
} from "../lib/workbench";
import { saveMorningReading } from "../lib/daily";
import { useLearning } from "../lib/store";
import "../workbench.css";

function ReadingBack({ className = "" }: { className?: string }) {
  return (
    <span className={`workbench-back ${className}`} aria-hidden="true">
      <span className="workbench-back-frame">
        <span className="workbench-back-emblem" />
      </span>
    </span>
  );
}

const fanLimit = (32 * Math.PI) / 180;

const initialDraft = (daily = false): ReadingDraft => ({
  question: daily ? "今天，我想留意生活中的哪些感受与细节？" : "",
  spreadId: daily ? "single" : "guidance",
  withReversals: true,
  cards: [],
  flipped: [],
  deck: [],
  selectedIndices: [],
  readingNotes: blankReadingNotes(),
  interpretation: "",
  reflection: "",
  referenceVisible: false,
  referenceViewed: false,
  hintLevel: 0,
  recordId: null,
});
const positionPurpose = (position: string) =>
  /过去/.test(position)
    ? "回顾已知经验，不补造过去发生的事。"
    : /阻碍/.test(position)
      ? "检查困难与限制，不把它当人格判断。"
      : /建议|行动/.test(position)
        ? "转成自己可以尝试、可以调整的行动。"
        : /未来|发展/.test(position)
          ? "讨论条件持续时的可能，不预设确定结局。"
          : "描述此刻的状态，先与真实背景核对。";

export function Lab() {
  const { state, saveDraft, saveRecord, error } = useLearning();
  const [params, setParams] = useSearchParams();
  const dailyMode = params.get("daily") === "1";
  const d = state.readingDraft || initialDraft(dailyMode);
  const [resetReason, setResetReason] = useState<
    "new" | "incoming" | "daily" | null
  >(null);
  const [shuffling, setShuffling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyDate, setDailyDate] = useState("");
  const [activeLevel, setActiveLevel] = useState(
    d.hintLevel || (d.referenceViewed || d.referenceVisible ? 4 : 1),
  );
  const [fanFocus, setFanFocus] = useState(0);
  const shuffleTimer = useRef<number | undefined>(undefined);
  const fan = useRef<HTMLDivElement>(null);
  const chosenCards = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => () => window.clearTimeout(shuffleTimer.current), []);
  const incoming = (params.get("question") || "").slice(0, 500);
  const deck = d.deck || [];
  const selected = d.selectedIndices || [];
  const focusableCard = selected.includes(fanFocus)
    ? deck.findIndex((_, index) => !selected.includes(index))
    : fanFocus;
  const active = deck.length > 0 || d.cards.length > 0;
  const spread = spreads.find((s) => s.id === d.spreadId) || spreads[0];
  const allSelected = d.cards.length === spread.positions.length;
  const allFlipped =
    allSelected && d.cards.every((c) => d.flipped.includes(c.cardId));
  const notes = d.readingNotes || blankReadingNotes();
  const ownLength =
    d.interpretation.trim().length +
    Object.values(notes).reduce((n, text) => n + text.trim().length, 0);
  const update = (patch: Partial<ReadingDraft>) => {
    saveDraft({ ...d, ...patch });
    setSaved(false);
    setDailyMessage("");
    setDailyError("");
  };
  const clearIncoming = () =>
    setParams(
      (p) => {
        p.delete("question");
        return p;
      },
      { replace: true },
    );
  const startShuffle = () => {
    if (active || shuffling || !d.question.trim()) return;
    setShuffling(true);
    shuffleTimer.current = window.setTimeout(() => {
      update({
        deck: createDeck(d.withReversals),
        selectedIndices: [],
        cards: [],
        flipped: [],
        interpretation: "",
        readingNotes: blankReadingNotes(),
        reflection: "",
        referenceVisible: false,
        referenceViewed: false,
        hintLevel: 0,
        recordId: null,
      });
      setActiveLevel(1);
      setFanFocus(0);
      setShuffling(false);
      window.requestAnimationFrame(() => {
        fan.current?.scrollTo({ left: 0, behavior: "instant" });
        fan.current?.querySelector<HTMLButtonElement>(".fan-card")?.focus({
          preventScroll: true,
        });
        fan.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
      });
    }, 650);
  };
  const choose = (index: number, keyboard: boolean) => {
    if (shuffling || allSelected || selected.includes(index)) return;
    const result = selectDeckCard(deck, selected, index, spread.positions);
    update(result);
    let next = (index + 1) % 78;
    while (
      result.selectedIndices.length < deck.length &&
      result.selectedIndices.includes(next)
    )
      next = (next + 1) % 78;
    setFanFocus(next);
    window.requestAnimationFrame(() => {
      if (result.cards.length === spread.positions.length) {
        chosenCards.current
          ?.querySelector<HTMLButtonElement>(".flip-card")
          ?.focus({ preventScroll: true });
        chosenCards.current?.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "auto"
            : "smooth",
        });
      } else
        fan.current
          ?.querySelectorAll<HTMLButtonElement>(".fan-card")
          [next]?.focus({ preventScroll: !keyboard });
    });
  };
  const reference = referenceAtLevel(d.cards, activeLevel);
  const highestSeen = Math.max(
    d.hintLevel || 0,
    d.referenceViewed ? 4 : d.referenceVisible && !deck.length ? 4 : 0,
  );
  const referenceSnapshot = referenceAtLevel(d.cards, highestSeen);
  const showReference = (level: number) => {
    if (level === 4 && ownLength < 10) return;
    const open = !(d.referenceVisible && activeLevel === level);
    setActiveLevel(level);
    update({
      referenceVisible: open,
      hintLevel: Math.max(highestSeen, level),
      referenceViewed: !!d.referenceViewed || level === 4,
    });
  };
  const save = () => {
    if (!allFlipped || ownLength < 10) return;
    const now = new Date().toISOString();
    const existing = d.recordId
      ? state.journal.find((r) => r.id === d.recordId)
      : undefined;
    const id = existing?.id || recordId();
    saveRecord({
      id,
      kind: "reading",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      date: existing?.date || dateKey(),
      title: d.question.slice(0, 60),
      question: d.question,
      spreadId: d.spreadId,
      cards: d.cards,
      interpretation: combinedInterpretation(d),
      reference: referenceSnapshot || existing?.reference || "",
      reflection: d.reflection,
      tags: ["解牌练习", spread.name],
    });
    saveDraft({ ...d, recordId: id });
    setSaved(true);
  };
  const saveDaily = async () => {
    if (!allFlipped || d.cards.length !== 1 || ownLength < 10 || dailySaving)
      return;
    setDailySaving(true);
    setDailyError("");
    setDailyMessage("");
    const date = dateKey();
    try {
      const result = await saveMorningReading({
        date,
        question: d.question,
        drawn: d.cards[0],
        interpretation: combinedInterpretation(d),
        reference: referenceSnapshot,
      });
      setDailyDate(date);
      setDailyMessage(
        result.created
          ? "晨间卡牌与初步解读已保存。晚上可以回到这一天继续记录。"
          : "这一天已有晨间记录，原卡牌与初步解读已保留。请到日记核对后继续，不会用本轮覆盖。",
      );
    } catch (e) {
      setDailyError(
        e instanceof Error ? e.message : "日记未能保存，请保留当前草稿后重试。",
      );
    } finally {
      setDailySaving(false);
    }
  };
  const progressStep = !active
    ? 0
    : !allSelected
      ? 1
      : !allFlipped
        ? 2
        : ownLength < 10
          ? 3
          : !d.referenceVisible
            ? 4
            : 5;
  return (
    <div
      className={`lab-page workbench-page page-enter ${active ? "has-spread" : ""}`}
    >
      <PageTitle
        eyebrow="AT YOUR READING TABLE"
        title="解牌工作台"
        description={active ? "" : "选定牌阵和规则，再亲手选牌。"}
      />
      <div className="learning-links">
        <Link to="/questions">如何提出好问题 / 优化问题 →</Link>
        <Link to="/first-reading">跟老师完成第一次解读 →</Link>
        <Link to="/daily">早晨抽牌，晚上回到日记 →</Link>
      </div>
      {incoming && (
        <section className="panel incoming-question">
          <h2>来自提问练习的新问题</h2>
          <p>{incoming}</p>
          <p className="muted">
            {active
              ? "当前洗好的牌组和抽牌草稿已保留。请先保存，或明确开始一次新练习。"
              : "确认后会填入问题框。也可以直接使用自己的问题，跳过优化。"}
          </p>
          <button
            className="button secondary"
            disabled={shuffling}
            onClick={() => {
              if (active) setResetReason("incoming");
              else {
                update({ question: incoming });
                clearIncoming();
              }
            }}
          >
            使用新问题
          </button>
          <button className="text-link" onClick={clearIncoming}>
            暂时保留当前练习
          </button>
        </section>
      )}
      <div className="workbench-flow" aria-label="占卜流程">
        {[
          "问题与规则",
          "铺牌与选择",
          "逐张翻牌",
          "独立观察",
          "解读与保存",
          "参考与复盘",
        ].map((label, i) => (
          <div
            className={i === progressStep ? "active" : ""}
            aria-current={i === progressStep ? "step" : undefined}
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
      {active ? (
        <section className="workbench-session panel" aria-label="本轮设置">
          <div>
            <p>{d.question}</p>
            <span>
              {spread.name} · {d.withReversals ? "含逆位" : "只看正位"}
            </span>
          </div>
          <button className="text-link" onClick={() => setResetReason("new")}>
            <RotateCcw size={14} /> 新的一次练习
          </button>
        </section>
      ) : (
        <section className="lab-setup panel">
          <div className="section-title">
            <h2>问题与规则</h2>
          </div>
          <label className="field">
            一个清楚、开放、与你有关的问题
            <textarea
              className="question-input"
              value={d.question}
              maxLength={500}
              disabled={active || shuffling}
              placeholder="例如：今天，我可以怎样留意自己的感受与需要？"
              onChange={(e) => update({ question: e.target.value })}
            />
          </label>
          <div className="workbench-setup-caption">
            <h3>选择牌阵</h3>
            <span>先约定每个位置，再抽牌</span>
          </div>
          <div className="spread-selector">
            {spreads.map((s) => (
              <button
                key={s.id}
                disabled={active || shuffling}
                className={d.spreadId === s.id ? "active" : ""}
                onClick={() => update({ spreadId: s.id })}
                aria-pressed={d.spreadId === s.id}
              >
                <div
                  className={`spread-mini ${s.positions.length === 1 ? "single" : ""}`}
                >
                  {s.positions.map((_, i) => (
                    <span key={i} />
                  ))}
                </div>
                <strong>{s.name}</strong>
                <small>{s.description}</small>
              </button>
            ))}
          </div>
          <details className="workbench-position-guide">
            <summary>这个牌阵适合怎样的问题？每个位置在问什么？</summary>
            <p>
              {spread.description}。位置是本次阅读的约定，不是必须发生的事情。
            </p>
            <dl>
              {spread.positions.map((position) => (
                <div key={position}>
                  <dt>{position}</dt>
                  <dd>{positionPurpose(position)}</dd>
                </div>
              ))}
            </dl>
          </details>
          <div className="draw-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={d.withReversals}
                disabled={active || shuffling}
                onChange={(e) => update({ withReversals: e.target.checked })}
              />
              加入逆位 <span>初学也可以只练正位</span>
            </label>
            {!active && (
              <button
                className="button primary"
                disabled={!d.question.trim() || shuffling}
                onClick={startShuffle}
              >
                <Shuffle size={17} className={shuffling ? "shuffling" : ""} />
                {shuffling ? "正在洗牌…" : "洗牌，开始观察"}
              </button>
            )}
          </div>
          {!active && (
            <button
              className="text-link morning-shortcut"
              disabled={shuffling}
              onClick={() =>
                update({
                  spreadId: "single",
                  question:
                    d.question || "今天，我想留意生活中的哪些感受与细节？",
                })
              }
            >
              只抽一张，作为今天的生活观察
            </button>
          )}
        </section>
      )}
      <section
        className={`workbench-table ${shuffling ? "is-shuffling" : ""}`}
        aria-label="抽牌区域"
      >
        <div className="workbench-table-heading">
          <div>
            <h2>
              {shuffling
                ? "让牌序重新混合"
                : deck.length && !allSelected
                  ? "选出你的牌"
                  : allSelected
                    ? "你选出的牌，已经留在桌上"
                    : "留一个呼吸，准备开始"}
            </h2>
          </div>
          <span role="status">
            {d.cards.length} / {spread.positions.length} 张已选
          </span>
        </div>
        {shuffling && (
          <div className="shuffle-deck" aria-label="正在洗牌">
            <ReadingBack />
            <ReadingBack />
            <ReadingBack />
          </div>
        )}
        {deck.length > 0 && (
          <>
            <div className="fan-instruction">
              <p id="fan-guide">
                {allSelected ? (
                  "可在下方逐张翻开。"
                ) : (
                  <>
                    <span className="fan-desktop-guide">
                      78 张牌已铺开，点击选牌。也可以用方向键浏览，再按回车。
                    </span>
                    <span className="fan-mobile-guide">
                      左右滑动，轻触选牌。
                    </span>
                  </>
                )}
              </p>
              <div className="fan-browse">
                <button
                  className="icon-button"
                  aria-label="向左浏览牌背"
                  onClick={() => fan.current?.scrollBy({ left: -340 })}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="向右浏览牌背"
                  onClick={() => fan.current?.scrollBy({ left: 340 })}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="fan-viewport" ref={fan} tabIndex={-1}>
              <div
                className={`fan-cards ${allSelected ? "selection-complete" : ""}`}
                role="group"
                aria-label="78张可选择的牌背"
                aria-describedby="fan-guide"
              >
                {deck.map((item, i) => {
                  const picked = selected.includes(i);
                  const progress = i / (deck.length - 1);
                  const angle = Math.asin(
                    (2 * progress - 1) * Math.sin(fanLimit),
                  );
                  const drop = (1 - Math.cos(angle)) / (1 - Math.cos(fanLimit));
                  return (
                    <div
                      key={item.cardId}
                      className={`fan-slot ${picked ? "picked" : ""}`}
                      style={
                        {
                          "--fan-progress": progress,
                          "--fan-drop": drop,
                          "--fan-turn": `${(angle * 180) / Math.PI}deg`,
                        } as CSSProperties
                      }
                    >
                      <button
                        type="button"
                        className="fan-card"
                        disabled={picked || allSelected}
                        tabIndex={
                          !picked && !allSelected && focusableCard === i
                            ? 0
                            : -1
                        }
                        aria-label={
                          picked ? `第${i + 1}张牌已选中` : `选择第${i + 1}张牌`
                        }
                        aria-pressed={picked}
                        onFocus={() => setFanFocus(i)}
                        onKeyDown={(e) => {
                          if (
                            ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                              e.key,
                            )
                          ) {
                            e.preventDefault();
                            const direction =
                              e.key === "ArrowLeft" || e.key === "End" ? -1 : 1;
                            let n =
                              e.key === "Home"
                                ? 0
                                : e.key === "End"
                                  ? deck.length - 1
                                  : i + direction;
                            while (selected.includes(n)) n += direction;
                            if (n < 0 || n >= deck.length) return;
                            setFanFocus(n);
                            fan.current
                              ?.querySelectorAll<HTMLButtonElement>(".fan-card")
                              [n]?.focus();
                          }
                        }}
                        onClick={(e) => choose(i, e.detail === 0)}
                      />
                      <ReadingBack className="fan-visual" />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {!deck.length && !d.cards.length && !shuffling && (
          <div className="waiting-deck">
            <ReadingBack />
            <p>洗牌后，78张牌背会在这里展开。</p>
          </div>
        )}
        <div
          ref={chosenCards}
          className={`drawn-cards count-${spread.positions.length}`}
        >
          {spread.positions.map((position, i) => {
            const item = d.cards[i];
            const flipped = !!item && d.flipped.includes(item.cardId);
            return (
              <div
                className={`drawn-card ${item ? "placed-card" : ""}`}
                key={`${item?.cardId || "empty"}-${position}`}
              >
                <span className="position-label">
                  {String(i + 1).padStart(2, "0")} · {position}
                </span>
                <button
                  className={`flip-card ${flipped ? "flipped" : ""}`}
                  disabled={!item || flipped || !allSelected}
                  aria-label={
                    item
                      ? flipped
                        ? `${cardById[item.cardId].name}，${item.reversed ? "逆位" : "正位"}`
                        : `翻开第${i + 1}张牌：${position}`
                      : "等待选牌"
                  }
                  onClick={() =>
                    item && update({ flipped: [...d.flipped, item.cardId] })
                  }
                >
                  <div className="flip-inner">
                    <div className="flip-back">
                      <ReadingBack />
                    </div>
                    <div className="flip-front">
                      {item && (
                        <CardArt
                          card={cardById[item.cardId]}
                          reversed={item.reversed}
                          priority
                        />
                      )}
                    </div>
                  </div>
                </button>
                {item && flipped ? (
                  <div className="drawn-card-name">
                    <strong>{cardById[item.cardId].name}</strong>
                    <span className={item.reversed ? "reversed-label" : ""}>
                      {item.reversed ? "逆位 Reversed" : "正位 Upright"}
                    </span>
                  </div>
                ) : (
                  <p className="waiting-label">
                    {item
                      ? allSelected
                        ? "轻触翻牌"
                        : "等其余牌选好后一起翻开"
                      : "等待你亲手选一张"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="table-note">
          同一次抽牌不放回；不重复实体牌。正逆位在洗牌时确定，不受选牌位置影响。
        </p>
      </section>
      {allFlipped && (
        <>
          <section className="independent-reading panel">
            <div className="eyebrow">YOUR VOICE COMES FIRST</div>
            <h2>
              <Feather size={21} />
              先写下，你看见的故事
            </h2>
            <p>
              先描述，再联想。可以只写一小段，也可以用下面四个角度慢慢展开。
            </p>
            <div className="reading-note-grid">
              {(
                [
                  [
                    "observation",
                    "观察到的画面",
                    "人物、动作、背景或一件物品。先只写可见事实。",
                  ],
                  [
                    "symbols",
                    "联想到的象征",
                    "这个细节让你想到什么？它是一种可能解释。",
                  ],
                  [
                    "context",
                    "当前问题的可能解释",
                    "结合你的实际背景，它可能提示哪些观察或行动？",
                  ],
                  [
                    "connections",
                    "多张牌之间的联系",
                    "主题如何相互补充或形成张力？单张牌可以留空。",
                  ],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label className="field" key={key}>
                  {label}
                  <textarea
                    aria-label={label}
                    value={notes[key]}
                    maxLength={5000}
                    placeholder={placeholder}
                    onChange={(e) =>
                      update({
                        readingNotes: { ...notes, [key]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              我的独立解读
              <textarea
                value={d.interpretation}
                maxLength={20000}
                placeholder="我看到……可能意味着……在这个位置我会考虑……还需要核实……"
                onChange={(e) => update({ interpretation: e.target.value })}
              />
            </label>
            <p className="muted">
              {ownLength < 10
                ? "在任一观察或解读字段写下合计至少10个字，才会解锁完整参考。"
                : "你的独立观察与解读已保存在草稿中。"}
            </p>
          </section>
          <section className="panel reference-layers">
            <div className="eyebrow">ONE LAYER AT A TIME</div>
            <h2>想看多少参考，由你决定</h2>
            <p className="muted">
              可以先只要一个提示。参考是帮助比较的线索，不会判断你的自由解读对错。
            </p>
            <div className="reference-level-buttons">
              {[
                ["一点提示", 1],
                ["基础牌义", 2],
                ["牌位读法", 3],
                ["完整参考", 4],
              ].map(([label, n]) => {
                const level = Number(n);
                return (
                  <button
                    key={level}
                    className={`button secondary ${d.referenceVisible && activeLevel === level ? "selected" : ""}`}
                    disabled={level === 4 && ownLength < 10}
                    data-level={level}
                    aria-expanded={d.referenceVisible && activeLevel === level}
                    aria-label={
                      level === 4
                        ? d.referenceVisible && activeLevel === 4
                          ? "收起参考解析"
                          : "查看参考解析"
                        : String(label)
                    }
                    onClick={() => showReference(level)}
                  >
                    <Eye size={15} />
                    {level === 4
                      ? d.referenceVisible && activeLevel === 4
                        ? "收起参考解析"
                        : "查看参考解析"
                      : label}
                    <small>
                      {level === 4 ? "先写自己的理解" : `第${level}层`}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
          {d.referenceVisible && (activeLevel < 4 || ownLength >= 10) && (
            <section className="reference-reading panel">
              <div className="eyebrow">ANOTHER WAY TO SEE</div>
              <h2>
                {
                  [
                    "",
                    "一点观察提示",
                    "基础牌义，放回画面里",
                    "位置改变了它正在回答的问题",
                    "一种有依据的参考思路",
                  ][activeLevel]
                }
              </h2>
              <p className="muted">
                由现有牌义与位置规则生成；你的具体经历仍需要自己补充、观察和核实。
              </p>
              <div className="reference-text">{reference}</div>
              <div className="reference-card-links">
                {d.cards.map((item) => (
                  <Link key={item.cardId} to={`/cards/${item.cardId}`}>
                    深入学习{cardById[item.cardId].name}
                    <ArrowRight size={13} />
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="practice-reflection panel">
            <h2>给今天的理解留一点回声</h2>
            <label className="field">
              学习心得与需要核实的事
              <textarea
                value={d.reflection}
                maxLength={10000}
                placeholder="哪些解释贴合？哪些不贴合？还有什么需要现实核实？"
                onChange={(e) => update({ reflection: e.target.value })}
              />
            </label>
            <div className="save-practice-row">
              {saved && !error ? (
                <Saved text="本次练习已存入学习日记" />
              ) : (
                <span className="muted">
                  {error
                    ? "当前保存存在问题，请查看页面顶部提示。"
                    : "草稿自动保存，可以稍后继续。"}
                </span>
              )}
              <button
                className="button primary"
                disabled={ownLength < 10}
                onClick={save}
              >
                <Save size={16} />
                {d.recordId ? "更新学习日记" : "保存本次练习"}
              </button>
            </div>
            {saved && (
              <Link className="text-link" to="/journal">
                在练习日记中回看
                <ArrowRight size={14} />
              </Link>
            )}
            {d.cards.length === 1 && (
              <div className="morning-reading-save">
                <h3>把这张牌，带进今天的生活</h3>
                <p>
                  保存晨间的初步理解，晚上再记录真实经历；觉得不契合也完全可以。
                </p>
                <button
                  className="button secondary"
                  disabled={ownLength < 10 || dailySaving}
                  onClick={saveDaily}
                >
                  {dailySaving ? "正在保存晨间记录…" : "保存为今日晨间卡牌"}
                </button>
                {dailyMessage && <p role="status">{dailyMessage}</p>}
                {dailyError && (
                  <p className="form-error" role="alert">
                    {dailyError}
                  </p>
                )}
                {dailyDate && (
                  <button
                    className="text-link"
                    onClick={() => navigate(`/daily?date=${dailyDate}`)}
                  >
                    打开这一天的日记
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
      <Notice>
        牌阵帮助整理观察；“未来”是有条件的可能。健康、法律与财务等决定需要现实资料与相应专业意见，不能用牌面替代。
      </Notice>
      <Confirm
        open={resetReason !== null}
        onClose={() => setResetReason(null)}
        title="开始新的一次练习？"
        action="清空草稿，重新开始"
        onConfirm={() => {
          const next = initialDraft(resetReason === "daily");
          if (resetReason === "incoming") next.question = incoming;
          saveDraft(next);
          clearIncoming();
          setSaved(false);
          setDailyMessage("");
          setDailyError("");
          setActiveLevel(1);
          setResetReason(null);
        }}
      >
        <p>
          这会清空当前未保存的牌组、选牌和解读草稿。已存入练习日记或每日日记的记录会继续保留；想留住当前内容，可以先取消并保存。
        </p>
      </Confirm>
    </div>
  );
}
