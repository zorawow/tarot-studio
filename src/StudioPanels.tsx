import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Feather, Save } from "lucide-react";
import { Notice, PageTitle, Saved } from "./components";
import { listDaily, type DailyEntry, lifeTopics } from "./lib/daily";
import { dateKey, recordId } from "./lib/learning";
import { useLearning } from "./lib/store";
export function ReflectionSpace() {
  const { state, saveRecord, error } = useLearning();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loadError, setLoadError] = useState("");
  const [text, setText] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [topic, setTopic] = useState("自我认识");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    listDaily(false)
      .then(setEntries)
      .catch((e) => setLoadError(String(e.message || e)));
  }, []);
  const thoughts = state.journal.filter((r) => r.tags.includes("书房随想"));
  const counts = lifeTopics
    .map((t) => ({
      topic: t,
      count: entries.filter((e) => e.evening.topics.includes(t)).length,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
  const save = () => {
    const now = new Date().toISOString();
    const old = id ? state.journal.find((r) => r.id === id) : undefined;
    const key = old?.id || recordId();
    saveRecord({
      id: key,
      kind: "reflection",
      createdAt: old?.createdAt || now,
      updatedAt: now,
      date: old?.date || dateKey(),
      title: `书房随想 · ${topic}`,
      question: "今天，有什么想慢慢想清楚？",
      spreadId: "free",
      cards: [],
      interpretation: "",
      reference: "",
      reflection: text,
      tags: ["书房随想", topic],
    });
    setId(key);
    setSaved(true);
  };
  return (
    <div className="page-enter reflection-space">
      <PageTitle
        eyebrow="A QUIET PLACE TO THINK"
        title="先坐一会儿，不急着有答案"
        description="记录那些想留住的念头，也允许一时没有结论。"
      />
      <section className="panel reflection-writing">
        <Feather size={23} />
        <h2>今天，有什么想慢慢想清楚？</h2>
        <label className="field">
          这段随想的主题
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setSaved(false);
            }}
          >
            {lifeTopics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          我的随想
          <textarea
            value={text}
            maxLength={10000}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            placeholder="一个感受、一句想记住的话，或者一个还没有答案的问题……"
          />
        </label>
        <button
          className="button primary"
          onClick={save}
          disabled={!text.trim()}
        >
          <Save size={16} />
          {id ? "更新这段随想" : "留住这段随想"}
        </button>
        {saved && !error && <Saved text="随想已存入解牌与学习档案" />}
      </section>
      <section className="content-section">
        <h2>日记里，最近常出现的主题</h2>
        <p className="muted">
          只汇总你自己选择的标签，不推断人格、心理问题或人生结论。
        </p>
        <div className="tag-row">
          {counts.length ? (
            counts.slice(0, 6).map((t) => (
              <Link to="/daily/history" key={t.topic}>
                {t.topic} · {t.count}篇
              </Link>
            ))
          ) : (
            <Link to="/daily">写一篇自己的生活观察 →</Link>
          )}
        </div>
        {loadError && <Notice>{loadError}</Notice>}
      </section>
      <section className="content-section">
        <h2>想留住的日子与念头</h2>
        {thoughts.slice(0, 6).map((r) => (
          <button
            className="reflection-excerpt panel"
            key={r.id}
            onClick={() => {
              setText(r.reflection);
              setTopic(r.tags[1] || "自我认识");
              setId(r.id);
              setSaved(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <small>
              {r.date} · {r.tags[1]}
            </small>
            <p>{r.reflection}</p>
          </button>
        ))}
        {entries
          .filter((e) => e.awareness.remember || e.awareness.discovery)
          .slice(0, 5)
          .map((e) => (
            <Link
              className="reflection-excerpt panel"
              to={`/daily?date=${e.date}`}
              key={e.id}
            >
              <small>{e.date}</small>
              <p>{e.awareness.remember || e.awareness.discovery}</p>
            </Link>
          ))}
        <Link className="text-link" to="/daily/history">
          去日记里，慢慢回看 →
        </Link>
      </section>
    </div>
  );
}
export function MentorGuide() {
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="SYMBOLS & QUESTIONS"
        title="让一个问题，慢慢清楚起来"
        description="先用已有课程与练习，陪你找到自己的语言。"
      />
      <Notice>
        当前版本没有接入AI服务，也不会上传日记。这个入口提供离线学习与提问练习；AI对话属于后续阶段。
      </Notice>
      <div className="mentor-paths">
        {[
          [
            "/questions",
            "把问题问清楚",
            "使用透明规则检查问题，再编辑成自己的表达。",
          ],
          [
            "/courses/academy-principles",
            "区分观察、象征和事实",
            "知道解释从哪里来，也给其他可能留出空间。",
          ],
          [
            "/first-reading",
            "跟着老师做一次解读",
            "先写自己的理解，再逐步展开参考思路。",
          ],
          [
            "/reflection",
            "把想法留在书房里",
            "不必立刻行动，可以先记下感受和未解的问题。",
          ],
        ].map(([to, title, desc]) => (
          <Link className="panel" to={to} key={to}>
            <BookOpen size={23} />
            <h2>{title}</h2>
            <p>{desc}</p>
            <span>进入 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
