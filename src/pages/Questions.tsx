import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, WandSparkles } from "lucide-react";
import { Notice, PageTitle } from "../components";
import { optimizeQuestion } from "../lib/questions";
import { useLearning } from "../lib/store";
export function Questions() {
  const { state, saveQuestionDraft } = useLearning();
  const original = state.questionDraft?.original || "",
    selected = state.questionDraft?.selected || "";
  const [analyzed, setAnalyzed] = useState<string | null>(original || null);
  const navigate = useNavigate();
  const result = analyzed ? optimizeQuestion(analyzed) : null;
  const edit = (raw: string, choice: string) => {
    saveQuestionDraft(raw, choice);
  };
  return (
    <div className="question-page page-enter">
      <PageTitle
        eyebrow="ASK A CLEARER QUESTION"
        title="好问题，让观察有方向"
        description="把对结果的焦虑，转成能够探索的线索与行动。"
      />
      <Link className="back-link" to="/courses/academy-questions">
        先学习：如何提出一个好问题
      </Link>
      <Notice>
        这是公开规则与场景模板提供的提问练习，不是能理解所有语义的
        AI。请检查建议是否保留了你的真实意图；你始终可以自行修改。
      </Notice>
      <section className="panel question-workbench">
        <div className="eyebrow">01 · YOUR ORIGINAL QUESTION</div>
        <h2>你原本想问什么？</h2>
        <label className="field">
          原始问题
          <textarea
            aria-label="原始占卜问题"
            value={original}
            maxLength={500}
            placeholder="例如：他到底喜不喜欢我？或：我什么时候才能找到工作？"
            onChange={(e) => edit(e.target.value, selected)}
          />
        </label>
        <button
          className="button primary"
          disabled={original.trim().length < 2}
          onClick={() => setAnalyzed(original)}
        >
          <WandSparkles size={16} />
          检查问题与生成建议
        </button>
      </section>
      {result && (
        <>
          <section className="panel question-workbench">
            <div className="eyebrow">02 · DIAGNOSIS, NOT A VERDICT</div>
            <h2>从哪些角度检查？</h2>
            <p className="muted">
              识别场景：{result.domain} ·{" "}
              {result.recognized
                ? "请核对场景是否贴合"
                : "未可靠识别场景，使用通用原则"}
            </p>
            {original !== analyzed && (
              <Notice>
                原问题已修改。请重新点击“检查问题与生成建议”，更新下方建议。
              </Notice>
            )}
            <div className="diagnostic-grid">
              {result.diagnostics.map((d) => (
                <div key={d.code}>
                  <h3>{d.title}</h3>
                  <p>{d.detail}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="panel question-workbench">
            <div className="eyebrow">03 · CHOOSE & REWRITE</div>
            <h2>选一个方向，再改成你的语言</h2>
            <div className="question-suggestions">
              {result.suggestions.map((s, i) => (
                <label
                  className={`suggestion-card ${selected === s.question ? "selected" : ""}`}
                  key={i}
                >
                  <input
                    type="radio"
                    name="question-suggestion"
                    checked={selected === s.question}
                    onChange={() => edit(original, s.question)}
                  />
                  <span>
                    <strong>{s.question}</strong>
                    <small>{s.reason}</small>
                  </span>
                </label>
              ))}
            </div>
            <label className="field">
              最终练习问题（可编辑）
              <textarea
                aria-label="最终练习问题"
                value={selected}
                maxLength={500}
                onChange={(e) => edit(original, e.target.value)}
                placeholder="也可以不采用模板，自己写一个聚焦、开放、与你的行动有关的问题。"
              />
            </label>
            <div className="question-principles">
              <span>✓ 一个核心主题</span>
              <span>✓ 可观察或可行动</span>
              <span>✓ 保留不确定性</span>
              <span>✓ 贴合原本意图</span>
            </div>
            <div className="save-practice-row">
              <button
                className="button primary"
                disabled={selected.trim().length < 5}
                onClick={() =>
                  navigate(
                    `/lab?question=${encodeURIComponent(selected.trim())}`,
                  )
                }
              >
                带着问题去练习
                <ArrowRight size={16} />
              </button>
            </div>
            <small className="muted">
              如果实验室有尚未完成的抽牌，会先保留原草稿，由你决定何时使用新问题。
            </small>
          </section>
        </>
      )}
    </div>
  );
}
