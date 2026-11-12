import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Eye } from "lucide-react";
import { CardArt, Notice, Saved } from "./components";
import { cardById } from "./data/cards";
import { deepById } from "./data/deep";
import {
  positionLabels,
  uprightLabels,
  reversalLabels,
  type PositionKey,
} from "./data/deepTypes";
import type { TarotCard } from "./data/types";
import { dateKey, recordId, shuffle } from "./lib/learning";
import { useLearning } from "./lib/store";

const chapters = [
  ["story", "故事与图像"],
  ["meaning", "正逆位"],
  ["positions", "五种牌位"],
  ["contexts", "生活场景"],
  ["cases", "完整案例"],
  ["compare", "相似牌"],
  ["exercises", "理解测验"],
  ["teacher", "跟着老师解牌"],
] as const;
export function DeepCardLesson({
  card: c,
  reversed,
}: {
  card: TarotCard;
  reversed: boolean;
}) {
  const deep = deepById[c.id];
  const [orders] = useState(
    () => deep?.exercises.map((q) => shuffle(q.options.map((_, i) => i))) || [],
  );
  const [position, setPosition] = useState<PositionKey>("present");
  const [context, setContext] = useState<"love" | "work" | "social" | "growth">(
    "love",
  );
  const { state, saveTeaching, answer } = useLearning();
  const exerciseKey = `${c.id}-exercises`;
  const answers = state.teaching?.[exerciseKey]?.answers || {};
  if (!deep) return <Notice>请刷新页面加载这张牌的课程。</Notice>;
  return (
    <>
      <nav className="chapter-nav" aria-label="牌义课程目录">
        {chapters.map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              document
                .getElementById(`chapter-${key}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="content-section chapter" id="chapter-story">
        <div className="eyebrow">01 · READ THE PICTURE</div>
        <h2>先读画面，再理解故事</h2>
        <p>{deep.story}</p>
        <div className="visual-lessons">
          {deep.visual.map((v, i) => (
            <details key={i} open={i === 0}>
              <summary>
                {String(i + 1).padStart(2, "0")} · {v.detail}
              </summary>
              <dl>
                <dt>可见的图像</dt>
                <dd>{v.detail}</dd>
                <dt>常见象征解读</dt>
                <dd>{v.reading}</dd>
                <dt>为什么这样联系？</dt>
                <dd>{v.bridge}</dd>
              </dl>
            </details>
          ))}
        </div>
        <small className="muted">
          图像描述与象征解释分开阅读。象征联想是解释传统，并非每一项都有画家自述；下面的现代教学案例均为虚构练习。
        </small>
      </section>
      <section className="meaning-panel panel chapter" id="chapter-meaning">
        <div className="eyebrow">02 · DEPTH & NUANCE</div>
        <h2>
          {reversed ? "逆位：选择贴合背景的镜头" : "正位：主题的六个侧面"}
        </h2>
        <p>{reversed ? c.reversed : c.upright}</p>
        <dl className="teaching-dimensions">
          {Object.entries(reversed ? deep.reversed : deep.upright).map(
            ([key, text]) => (
              <div key={key}>
                <dt>
                  {(reversed ? reversalLabels : uprightLabels)[key as never]}
                </dt>
                <dd>{text}</dd>
              </div>
            ),
          )}
        </dl>
        <Notice>
          {reversed
            ? "逆位保留同一张牌的主题。根据已知情境选择一个或两个解释，不要把五种可能同时套在一个人身上。"
            : "正位也有代价和盲点。用左侧按钮切换逆位，观察同一主题如何受阻、过度或转向内在。"}
        </Notice>
      </section>
      <section className="content-section chapter" id="chapter-positions">
        <div className="eyebrow">03 · POSITION CHANGES THE QUESTION</div>
        <h2>同一张牌，为什么有不同解释？</h2>
        <p>
          牌面提供主题，牌位规定它正在回答什么。先看位置，再把名词转成状态、背景、困难、行动或有条件的发展。
        </p>
        <div className="context-tabs" aria-label="牌位示例">
          {Object.entries(positionLabels).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={position === key}
              className={position === key ? "active" : ""}
              onClick={() => setPosition(key as PositionKey)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="reference-box" aria-live="polite">
          <strong>
            {positionLabels[position]} · {deep.positions[position].question}
          </strong>
          <p>{deep.positions[position].meaning}</p>
          <p>
            <b>示例：</b>
            {deep.positions[position].example}
          </p>
          <small>
            此处先练习正位的牌位语法；逆位再结合上面的镜头检查。趋势位始终需要现实条件，不能作保证。
          </small>
        </div>
      </section>
      <section className="content-section chapter" id="chapter-contexts">
        <div className="eyebrow">04 · CONTEXT MAKES MEANING</div>
        <h2>把图像放进具体生活</h2>
        <div className="context-tabs">
          {(
            [
              ["love", "爱情与亲密关系"],
              ["work", "事业与工作"],
              ["social", "人际关系"],
              ["growth", "个人成长"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={context === key}
              className={context === key ? "active" : ""}
              onClick={() => setContext(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="context-content">
          <p>{deep.contexts[context]}</p>
          <small>
            保留这张牌的核心主题，改变它对应的人、行为与资源；解释仍须由真实互动和事实核实。
          </small>
        </div>
      </section>
      <section className="content-section chapter" id="chapter-cases">
        <div className="eyebrow">05 · WORKED EXAMPLES</div>
        <h2>看见完整的推理过程</h2>
        {deep.cases.map((item, i) => (
          <details className="worked-case" key={item.title}>
            <summary>
              <span>
                案例 {i + 1} · {item.title}
              </span>
              <small>
                {positionLabels[item.position]} ·{" "}
                {item.reversed ? "逆位" : "正位"}
              </small>
            </summary>
            <p>
              <b>咨询背景：</b>
              {item.background}
            </p>
            <p>
              <b>问题：</b>
              {item.question}
            </p>
            <p>
              <b>抽到：</b>
              {c.name}（{item.reversed ? "逆位" : "正位"}），
              {positionLabels[item.position]}
            </p>
            <ol className="reasoning-chain">
              <li>
                <b>观察图像</b>
                <p>{item.observation}</p>
              </li>
              <li>
                <b>联系象征</b>
                <p>{item.symbolism}</p>
              </li>
              <li>
                <b>结合问题与位置</b>
                <p>{item.reasoning}</p>
              </li>
              <li>
                <b>形成参考解读</b>
                <p>{item.interpretation}</p>
              </li>
            </ol>
            <p>
              <b>另一种可能：</b>
              {item.alternative}
            </p>
            <p className="action-note">
              <b>现实中的下一步：</b>
              {item.action}
            </p>
          </details>
        ))}
      </section>
      <section className="content-section chapter" id="chapter-compare">
        <div className="eyebrow">06 · NOTICE THE DIFFERENCE</div>
        <h2>相似主题，画面怎样不同？</h2>
        {c.compare.map((comp) => (
          <Link
            key={comp.id}
            to={`/cards/${comp.id}`}
            className="comparison-card"
          >
            <CardArt card={cardById[comp.id]} />
            <div>
              <h3>
                {c.name}与{cardById[comp.id].name}
              </h3>
              <p>{comp.difference}</p>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      </section>
      <section className="content-section chapter" id="chapter-exercises">
        <div className="eyebrow">07 · CHECK YOUR UNDERSTANDING</div>
        <h2>从记住，到解释得出来</h2>
        {deep.exercises.map((q, i) => {
          const selected = answers[q.kind] ?? answers[String(i)];
          const done = selected !== undefined && selected >= 0;
          return (
            <div className="teaching-question panel" key={q.kind}>
              <span className="card-category">
                {i + 1} ·{" "}
                {
                  {
                    observation: "图像观察",
                    reasoning: "牌义推理",
                    scenario: "情境判断",
                  }[q.kind]
                }
              </span>
              <h3>{q.question}</h3>
              <div className="quiz-options">
                {(orders[i] || q.options.map((_, n) => n)).map(
                  (n, displayIndex) => (
                    <button
                      key={n}
                      disabled={done}
                      className={`quiz-option ${done && n === q.answer ? "correct" : ""} ${done && n === selected && n !== q.answer ? "wrong" : ""}`}
                      onClick={() => {
                        saveTeaching(exerciseKey, {
                          answers: { ...answers, [q.kind]: n },
                        });
                        answer(c.id, n === q.answer);
                      }}
                    >
                      <span>{String.fromCharCode(65 + displayIndex)}</span>
                      {q.options[n]}
                    </button>
                  ),
                )}
              </div>
              {done && (
                <div className="reference-box" role="status">
                  <strong>
                    {selected === q.answer ? "回答正确" : "再看看图像依据"} ·
                    正确答案{" "}
                    {String.fromCharCode(
                      65 +
                        (orders[i] || q.options.map((_, n) => n)).indexOf(
                          q.answer,
                        ),
                    )}
                  </strong>
                  <p>{q.explanation}</p>
                  <button
                    className="text-link"
                    onClick={() =>
                      saveTeaching(exerciseKey, {
                        answers: { ...answers, [q.kind]: -1 },
                      })
                    }
                  >
                    重新练习此题
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
      <section className="content-section chapter" id="chapter-teacher">
        <GuidedCardPractice
          key={`${c.id}-${reversed}`}
          card={c}
          reversed={reversed}
        />
      </section>
    </>
  );
}

export function GuidedCardPractice({
  card: c,
  reversed = false,
}: {
  card: TarotCard;
  reversed?: boolean;
}) {
  const { state, saveTeaching, saveRecord, error } = useLearning();
  const [position, setPosition] = useState<PositionKey>("advice");
  const [saved, setSaved] = useState(false);
  const key = `${c.id}-${position}-${reversed ? "reversed" : "upright"}`;
  const p = state.teaching?.[key];
  const deep = deepById[c.id],
    lesson = deep.positions[position];
  const scenario = deep.cases.find(
    (item) => item.position === position && item.reversed === reversed,
  );
  const question =
    scenario?.question || `围绕“${deep.cases[0].title}”，${lesson.question}`;
  const steps = [
    [
      "观察到的牌面元素",
      scenario?.observation || deep.visual.map((v) => v.detail).join(" "),
    ],
    [
      "对应的象征意义",
      scenario?.symbolism ||
        deep.visual[0].reading + " " + deep.visual[0].bridge,
    ],
    [
      "结合问题背景",
      scenario?.background ||
        `${deep.cases[0].background} 本次换成${positionLabels[position]}，只用已知背景检查假设，不沿用原案例的结论。`,
    ],
    [
      "结合牌阵位置",
      scenario?.reasoning ||
        `${positionLabels[position]}回答的是“${lesson.question}”。${lesson.meaning}${reversed ? " 逆位时再检查主题受阻、过度、不足或内在化，选择有情境依据的一项。" : ""}`,
    ],
    [
      "合理的参考解读",
      scenario?.interpretation ||
        `先将“${lesson.meaning}”作为本次背景下待检查的解释。另一个情境的牌位示例：${lesson.example} 请比较两个背景，保留有依据的部分，不能直接照搬示例中的人物或事件。${reversed ? " 逆位还需说明选择哪一个镜头，以及背景中的什么信息支持它。" : ""}`,
    ],
  ];
  const update = (patch: Parameters<typeof saveTeaching>[1]) => {
    saveTeaching(key, patch);
    setSaved(false);
  };
  const save = () => {
    const now = new Date().toISOString();
    const existing = p?.recordId
      ? state.journal.find((r) => r.id === p.recordId)
      : undefined;
    const id = existing?.id || recordId();
    saveRecord({
      id,
      kind: "reflection",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      date: existing?.date || dateKey(),
      title: `跟着老师解牌 · ${c.name} · ${positionLabels[position]}`,
      question,
      spreadId: "teaching-position",
      cards: [{ cardId: c.id, reversed, position: positionLabels[position] }],
      interpretation: p?.draft || "",
      reference: steps
        .slice(0, p?.revealedSteps || 0)
        .map((s) => s.join("："))
        .join("\n\n"),
      reflection: p?.reflection || "",
      tags: ["牌位训练", c.name, positionLabels[position]],
      lessonId: c.id,
    });
    update({ recordId: id, completedAt: now });
    setSaved(true);
  };
  return (
    <div className="teacher-practice panel">
      <div className="eyebrow">08 · THINK WITH YOUR TEACHER</div>
      <h2>跟着老师，学会自己解牌</h2>
      <p>
        换一个位置，再观察解释怎样改变。这里不自动评判自由作答，重点是核对推理依据。
      </p>
      <label className="field">
        练习牌位
        <select
          aria-label="老师练习牌位"
          value={position}
          onChange={(e) => {
            setPosition(e.target.value as PositionKey);
            setSaved(false);
          }}
        >
          {Object.entries(positionLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <div className="teacher-card-row">
        <CardArt card={c} reversed={reversed} />
        <div className="reference-box">
          <strong>
            {c.name} · {reversed ? "逆位" : "正位"} · {positionLabels[position]}
          </strong>
          <p>{question}</p>
          <small>{scenario?.background || deep.cases[0].background}</small>
        </div>
      </div>
      <label className="field">
        我的解读（先观察，再联系问题）
        <textarea
          aria-label="老师练习我的解读"
          value={p?.draft || ""}
          maxLength={10000}
          onChange={(e) => update({ draft: e.target.value })}
          placeholder="我注意到……这可能象征……放在这个位置，意味着……"
        />
      </label>
      {(p?.draft.trim().length || 0) < 10 && (
        <small className="muted">
          写下至少10个字，即可逐步查看老师的思路。
        </small>
      )}
      <ol className="reasoning-chain">
        {steps.slice(0, p?.revealedSteps || 0).map(([title, text]) => (
          <li key={title}>
            <b>{title}</b>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      {(p?.revealedSteps || 0) < 5 && (
        <button
          className="button secondary"
          disabled={(p?.draft.trim().length || 0) < 10}
          onClick={() => update({ revealedSteps: (p?.revealedSteps || 0) + 1 })}
        >
          <Eye size={16} />
          展开第{(p?.revealedSteps || 0) + 1}步思路
        </button>
      )}
      {(p?.revealedSteps || 0) === 5 && (
        <>
          <p className="action-note">
            {scenario
              ? `另一种可能：${scenario.alternative} 下一步：${scenario.action}`
              : "请补充一个现实中可尝试的小行动和一条需要核实的信息；同一图像可能支持多种合理解释。"}
          </p>
          <label className="field">
            我遗漏的线索与新的理解
            <textarea
              aria-label="老师练习复盘"
              value={p?.reflection || ""}
              maxLength={10000}
              onChange={(e) => update({ reflection: e.target.value })}
            />
          </label>
        </>
      )}
      <div className="save-practice-row">
        <small className="muted">每个牌位、正逆位的草稿分别自动保存。</small>
        <button
          className="button primary"
          disabled={(p?.draft.trim().length || 0) < 10}
          onClick={save}
        >
          <Check size={16} />
          {p?.recordId ? "更新练习日记" : "保存练习到日记"}
        </button>
      </div>
      {saved && !error && <Saved text="练习与已展开的思路已保存到学习日记" />}
    </div>
  );
}
