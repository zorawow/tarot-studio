import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye } from "lucide-react";
import { CardArt, Notice, PageTitle, Saved } from "../components";
import { cardById } from "../data/cards";
import { firstReading, readingSteps } from "../data/academy";
import { useLearning } from "../lib/store";
import { dateKey, recordId } from "../lib/learning";

export function ProcessGuide() {
  const [step, setStep] = useState(0);
  const item = readingSteps[step];
  return (
    <section className="panel process-guide">
      <div className="eyebrow">THE COMPLETE READING PROCESS</div>
      <h2>十步，把图像变成有依据的反思</h2>
      <div className="process-track" aria-label="占卜流程步骤">
        {readingSteps.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={i === step}
            className={i === step ? "active" : ""}
            onClick={() => setStep(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </button>
        ))}
      </div>
      <div className="process-detail" aria-live="polite">
        <h3>
          {step + 1}. {item.title}
        </h3>
        <dl>
          <dt>怎样操作</dt>
          <dd>{item.operation}</dd>
          <dt>目的与原理</dt>
          <dd>{item.purpose}</dd>
          <dt>常见错误</dt>
          <dd>{item.mistake}</dd>
          <dt>示例</dt>
          <dd>{item.example}</dd>
          <dt>初学者提醒</dt>
          <dd>{item.caution}</dd>
        </dl>
      </div>
      <div className="save-practice-row">
        <button
          className="button secondary"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft size={15} />
          上一步
        </button>
        <button
          className="button primary"
          disabled={step === 9}
          onClick={() => setStep(step + 1)}
        >
          下一步
          <ArrowRight size={15} />
        </button>
      </div>
      <Link className="text-link" to="/first-reading">
        把这十步用在第一次教学解读中 →
      </Link>
    </section>
  );
}

export function FirstReading() {
  const { state, saveTeaching, saveRecord, saveLesson, error } = useLearning();
  const key = "guided-first-reading",
    p = state.teaching?.[key];
  const [step, setStep] = useState(Math.min(9, p?.revealedSteps || 0));
  const [saved, setSaved] = useState(false);
  const item = readingSteps[step],
    c = cardById[firstReading.cardId];
  const answers = p?.answers || {};
  const update = (patch: Parameters<typeof saveTeaching>[1]) => {
    saveTeaching(key, patch);
    setSaved(false);
  };
  const teacher = [
    ["观察牌面", firstReading.observation],
    ["联系象征", firstReading.symbolism],
    ["结合情境", firstReading.context],
    ["结合建议位", firstReading.positionMeaning],
    ["参考解读", firstReading.interpretation],
    ["保留其他可能", firstReading.alternative],
    ["现实行动", firstReading.action],
  ];
  const next = () => {
    update({ revealedSteps: Math.max(p?.revealedSteps || 0, step + 1) });
    setStep(Math.min(9, step + 1));
  };
  const canContinue =
    step === 0
      ? !!answers["0"]
      : step === 1
        ? !!answers["1"]
        : step === 2
          ? !!answers["2"]
          : step === 3
            ? !!answers["3"]
            : step === 4
              ? !!answers["4"]
              : step === 5
                ? (p?.draft.trim().length || 0) >= 10
                : step === 8
                  ? (p?.reflection.trim().length || 0) >= 5
                  : true;
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
      title: "我的第一次教学解读",
      question: firstReading.question,
      spreadId: "guided-first-reading",
      cards: [{ cardId: c.id, reversed: false, position: "建议位" }],
      interpretation: p?.draft || "",
      reference:
        answers.referenceViewed || answers.reference
          ? teacher.map((x) => x.join("：")).join("\n\n")
          : existing?.reference || "",
      reflection: p?.reflection || "",
      tags: ["首次解读", "教学案例", c.name],
      lessonId: "guided-first-reading",
    });
    saveLesson("guided-first-reading", p?.draft || "", true);
    update({ completedAt: now, recordId: id });
    setSaved(true);
  };
  return (
    <div className="page-enter first-reading-page">
      <PageTitle
        eyebrow="YOUR FIRST GUIDED READING"
        title="第一次解读，我们一起走"
        description="先用一个固定教学案例练习完整流程，再进入真正的随机抽牌。"
      />
      <Notice>
        此处使用预先选定的教学牌，便于对照推理；不是一次随机抽取，也不预测现实结果。流程中的选择和草稿会自动保存。
      </Notice>
      <div className="guided-layout">
        <nav className="guided-nav" aria-label="首次解读步骤">
          {readingSteps.map((s, i) => (
            <button
              key={s.id}
              disabled={i > (p?.revealedSteps || 0)}
              className={step === i ? "active" : ""}
              onClick={() => setStep(i)}
            >
              <span>
                {i < (p?.revealedSteps || 0) ? <Check size={14} /> : i + 1}
              </span>
              {s.title}
            </button>
          ))}
        </nav>
        <section className="panel guided-content">
          <div className="eyebrow">
            STEP {String(step + 1).padStart(2, "0")} / 10
          </div>
          <h2>{item.title}</h2>
          <p>{item.operation}</p>
          <details>
            <summary>为什么要这一步？常见错误是什么？</summary>
            <dl>
              <dt>目的</dt>
              <dd>{item.purpose}</dd>
              <dt>常见错误</dt>
              <dd>{item.mistake}</dd>
              <dt>示例</dt>
              <dd>{item.example}</dd>
              <dt>提醒</dt>
              <dd>{item.caution}</dd>
            </dl>
          </details>
          {step === 0 && (
            <>
              <div className="reference-box">
                <strong>教学背景与问题</strong>
                <p>{firstReading.context}</p>
                <p>{firstReading.question}</p>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!answers["0"]}
                  onChange={(e) =>
                    update({
                      answers: { ...answers, 0: e.target.checked ? 1 : 0 },
                    })
                  }
                />
                我确认这是一项聚焦自己行动的探索
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <p>
                第一次先选单张「建议位」：只练习把主题转成一个现实中可尝试的行动，减少信息负担。
              </p>
              <button
                className={`button secondary ${answers["1"] ? "selected" : ""}`}
                onClick={() => update({ answers: { ...answers, 1: 1 } })}
              >
                选择：单张牌 · 建议位 {answers["1"] ? "✓" : ""}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <p>
                洗牌与切牌有多种约定，教学没有唯一正确仪式。本次约定只练习正位，先把图像读清楚。真实模拟会使用无放回随机抽取。
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!answers["2"]}
                  onChange={(e) =>
                    update({
                      answers: { ...answers, 2: e.target.checked ? 1 : 0 },
                    })
                  }
                />
                本次采用一张牌、只用正位的约定
              </label>
            </>
          )}
          {step === 3 && (
            <div className="fixed-draw">
              <button
                className="button primary"
                disabled={!!answers["3"]}
                onClick={() => update({ answers: { ...answers, 3: 1 } })}
              >
                {answers["3"] ? "教学牌已揭开" : "揭开本次预设教学牌"}
              </button>
              {!!answers["3"] && (
                <>
                  <CardArt card={c} />
                  <strong>{c.name} · 正位</strong>
                </>
              )}
            </div>
          )}
          {step === 4 && (
            <>
              <div className="fixed-draw">
                <CardArt card={c} />
              </div>
              <p>
                同一张牌在现状位描述状态，在建议位应转成行动。本例的位置是「建议」，不能据此保证未来结果。
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!answers["4"]}
                  onChange={(e) =>
                    update({
                      answers: { ...answers, 4: e.target.checked ? 1 : 0 },
                    })
                  }
                />
                我将回答「我可以怎样做」，而非「结局一定怎样」
              </label>
            </>
          )}
          {step === 5 && (
            <>
              <div className="fixed-draw">
                <CardArt card={c} />
              </div>
              <p>
                <b>问题：</b>
                {firstReading.question}
              </p>
              <label className="field">
                先写你的观察与初步解释
                <textarea
                  aria-label="首次解读我的解释"
                  value={p?.draft || ""}
                  maxLength={10000}
                  onChange={(e) => update({ draft: e.target.value })}
                  placeholder="看见什么？它与建议位有什么关系？我能尝试什么？至少10个字。"
                />
              </label>
            </>
          )}
          {step === 6 && (
            <>
              <p>你的独立解读：</p>
              <blockquote>{p?.draft}</blockquote>
              <button
                className="button secondary"
                disabled={(p?.draft.trim().length || 0) < 10}
                aria-expanded={!!answers.reference}
                onClick={() =>
                  update({
                    answers: {
                      ...answers,
                      reference: answers.reference ? 0 : 1,
                      referenceViewed: 1,
                    },
                  })
                }
              >
                <Eye size={16} />
                {answers.reference ? "收起老师思路" : "对照老师的逐步推理"}
              </button>
              {!!answers.reference && (p?.draft.trim().length || 0) >= 10 && (
                <ol className="reasoning-chain">
                  {teacher.map(([title, text]) => (
                    <li key={title}>
                      <b>{title}</b>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          {step === 7 && (
            <>
              <p>
                本次只有一张牌，不必制造不存在的牌间关系。把「问题 → 画面 →
                建议位 → 行动」连成一句话即可。
              </p>
              <p className="action-note">
                以后使用三张牌时，先分开回答每个位置，再看主题重复、动作延续和互相补充；不要为了故事完整而补造事件。
              </p>
              <Link className="text-link" to="/courses/card-relationships">
                查看多张牌关系课程 →
              </Link>
            </>
          )}
          {step === 8 && (
            <label className="field">
              我的行动、遗漏线索与待核实信息
              <textarea
                aria-label="首次解读复盘"
                value={p?.reflection || ""}
                maxLength={10000}
                onChange={(e) => update({ reflection: e.target.value })}
                placeholder="我会尝试……我漏看了……需要现实核实……至少5个字。"
              />
            </label>
          )}
          {step === 9 && (
            <>
              <h3>你已经完成了一次有依据的解读练习</h3>
              <p>
                记录保留你自己的声音、已展开的参考和复盘。以后可以回来看哪些行动有帮助，而非只记“准不准”。
              </p>
              <button
                className="button primary"
                disabled={
                  (p?.draft.trim().length || 0) < 10 ||
                  (p?.reflection.trim().length || 0) < 5
                }
                onClick={save}
              >
                {p?.recordId ? "更新首次解读记录" : "保存并完成首次解读"}
              </button>
              {saved && !error && (
                <Saved text="首次解读已存入学习日记，课程已标记完成" />
              )}
              <div className="learning-links">
                <Link
                  to={`/lab?question=${encodeURIComponent(firstReading.question)}`}
                >
                  进入随机抽牌，独立练习 →
                </Link>
                <Link to="/questions">换一个自己的问题 →</Link>
              </div>
            </>
          )}
          <div className="save-practice-row">
            <button
              className="button secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              上一步
            </button>
            {step < 9 && (
              <button
                className="button primary"
                disabled={!canContinue}
                onClick={next}
              >
                完成这一步
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
