import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Feather,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { CardArt, Confirm, Empty, PageTitle, Saved } from "../components";
import { cards, cardById } from "../data/cards";
import type { PracticeRecord } from "../data/types";
import { dateKey, validDate, spreads, recordId } from "../lib/learning";
import { useLearning } from "../lib/store";
function newEntry(): PracticeRecord {
  const now = new Date().toISOString();
  return {
    id: recordId(),
    kind: "reflection",
    createdAt: now,
    updatedAt: now,
    date: dateKey(),
    title: "",
    question: "",
    spreadId: "free",
    cards: [],
    interpretation: "",
    reference: "",
    reflection: "",
    tags: [],
  };
}
export function Journal() {
  const { state, saveRecord, deleteRecord, error } = useLearning();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [edit, setEdit] = useState<PracticeRecord | null>(null);
  const [cardToAdd, setCardToAdd] = useState("major-0");
  const [tagText, setTagText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [saved, setSaved] = useState(false);
  const filtered = state.journal
    .filter(
      (r) =>
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        [
          r.title,
          r.question,
          r.interpretation,
          r.reflection,
          ...r.tags,
          ...r.cards.map((c) => cardById[c.cardId]?.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  const viewed = state.journal.find((r) => r.id === viewId);
  const beginEdit = (r: PracticeRecord) => {
    setEdit(structuredClone(r));
    setTagText(r.tags.join("，"));
    setSaved(false);
  };
  const save = () => {
    if (!edit || !edit.title.trim() || !validDate(edit.date)) return;
    const r = {
      ...edit,
      title: edit.title.trim(),
      tags: tagText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      updatedAt: new Date().toISOString(),
    };
    saveRecord(r);
    setEdit(null);
    setViewId(r.id);
    setSaved(true);
  };
  if (edit)
    return (
      <div className="journal-editor page-enter">
        <button className="back-link" onClick={() => setDiscard(true)}>
          <ArrowLeft size={15} />
          返回学习日记
        </button>
        <PageTitle
          eyebrow="A PAGE FOR YOURSELF"
          title={
            state.journal.some((r) => r.id === edit.id)
              ? "重读这一页，也补上新的理解"
              : "为今天，留下一页"
          }
          description="记录观察与当时的思路，让以后的你能看见理解怎样变化。"
        />
        <div className="panel journal-form">
          <div className="form-grid">
            <label className="field">
              标题
              <input
                aria-label="日记标题"
                maxLength={100}
                placeholder="今天的观察、练习或一个小小发现"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label className="field">
              日期
              <input
                aria-label="日记日期"
                type="date"
                value={edit.date}
                onChange={(e) => setEdit({ ...edit, date: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            练习问题
            <input
              aria-label="日记练习问题"
              maxLength={500}
              placeholder="这次想理解的具体问题（可选）"
              value={edit.question}
              onChange={(e) => setEdit({ ...edit, question: e.target.value })}
            />
          </label>
          <div className="field">
            <span>学习或抽到的牌</span>
            <div className="add-card-row">
              <select
                aria-label="选择日记关联的牌"
                value={cardToAdd}
                onChange={(e) => setCardToAdd(e.target.value)}
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.english}
                  </option>
                ))}
              </select>
              <button
                className="button secondary"
                disabled={edit.cards.some((c) => c.cardId === cardToAdd)}
                onClick={() =>
                  setEdit({
                    ...edit,
                    cards: [
                      ...edit.cards,
                      {
                        cardId: cardToAdd,
                        reversed: false,
                        position: `记录的牌${edit.cards.length + 1}`,
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                加入
              </button>
            </div>
            <div className="journal-card-picks">
              {edit.cards.map((c, i) => (
                <div key={c.cardId}>
                  <CardArt card={cardById[c.cardId]} reversed={c.reversed} />
                  <strong>{cardById[c.cardId].name}</strong>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      aria-label={`${cardById[c.cardId].name}设为逆位`}
                      checked={c.reversed}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          cards: edit.cards.map((x, j) =>
                            j === i ? { ...x, reversed: e.target.checked } : x,
                          ),
                        })
                      }
                    />
                    逆位
                  </label>
                  <button
                    className="icon-button"
                    aria-label={`移除${cardById[c.cardId].name}`}
                    onClick={() =>
                      setEdit({
                        ...edit,
                        cards: edit.cards.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <label className="field">
            我当时的解读或观察
            <textarea
              aria-label="日记独立解读"
              maxLength={20000}
              value={edit.interpretation}
              onChange={(e) =>
                setEdit({ ...edit, interpretation: e.target.value })
              }
              placeholder="先写画面依据，再写你的假设、行动和待核实信息…"
            />
          </label>
          {edit.reference && (
            <details className="journal-reference">
              <summary>保留的参考解析</summary>
              <p className="reference-text">{edit.reference}</p>
            </details>
          )}
          <label className="field">
            学习心得与复盘
            <textarea
              aria-label="日记学习心得"
              maxLength={10000}
              value={edit.reflection}
              onChange={(e) => setEdit({ ...edit, reflection: e.target.value })}
              placeholder="有哪些理解改变了？有没有反证、不贴合的地方或值得继续观察的问题？"
            />
          </label>
          <label className="field">
            标签（用逗号分隔）
            <input
              aria-label="日记标签"
              maxLength={500}
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="例如：符号观察，愚者之旅，复盘"
            />
          </label>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDiscard(true)}
            >
              取消编辑
            </button>
            <button
              className="button primary"
              disabled={!edit.title.trim() || !validDate(edit.date)}
              onClick={save}
            >
              <Save size={16} />
              保存这一页
            </button>
          </div>
        </div>
        <Confirm
          open={discard}
          onClose={() => setDiscard(false)}
          title="离开这次编辑？"
          action="放弃未保存修改"
          onConfirm={() => {
            setEdit(null);
            setDiscard(false);
          }}
        >
          <p>
            此页面编辑需点击保存。当前未保存的修改会被放弃，原有日记仍会保留。
          </p>
        </Confirm>
      </div>
    );
  if (viewed)
    return (
      <div className="journal-reading page-enter">
        <button
          className="back-link"
          onClick={() => {
            setViewId(null);
            setSaved(false);
          }}
        >
          <ArrowLeft size={15} />
          返回所有日记
        </button>
        <PageTitle
          eyebrow={
            viewed.kind === "reading"
              ? "A READING TO REMEMBER"
              : "MY LEARNING REFLECTION"
          }
          title={viewed.title}
          description={`${viewed.date} · ${viewed.kind === "reading" ? spreads.find((s) => s.id === viewed.spreadId)?.name || "解牌练习" : "学习随记"}`}
        >
          <button
            className="button secondary"
            onClick={() => beginEdit(viewed)}
          >
            <Pencil size={15} />
            编辑
          </button>
          <button
            className="icon-button danger"
            aria-label="删除这篇日记"
            onClick={() => setDeleteId(viewed.id)}
          >
            <Trash2 size={18} />
          </button>
        </PageTitle>
        {saved && !error && <Saved text="日记已保存在此浏览器" />}
        {viewed.question && (
          <div className="journal-question">
            <span>本次问题</span>
            <h2>{viewed.question}</h2>
          </div>
        )}
        {viewed.cards.length > 0 && (
          <div className="journal-spread">
            {viewed.cards.map((c) => (
              <Link key={c.cardId} to={`/cards/${c.cardId}`}>
                <span>{c.position}</span>
                <CardArt card={cardById[c.cardId]} reversed={c.reversed} />
                <strong>{cardById[c.cardId].name}</strong>
                <small>{c.reversed ? "逆位" : "正位"}</small>
              </Link>
            ))}
          </div>
        )}
        <div className="panel journal-body">
          <section>
            <h2>我当时的理解</h2>
            <p>
              {viewed.interpretation ||
                "这一页记录的是心得，可以在下方继续回看。"}
            </p>
          </section>
          {viewed.reference && (
            <details className="journal-reference">
              <summary>打开当时保存的参考解析</summary>
              <p className="reference-text">{viewed.reference}</p>
            </details>
          )}
          <section>
            <h2>留下的心得</h2>
            <p>{viewed.reflection || "可以点击编辑，补上后来观察到的变化。"}</p>
          </section>
          <div className="tag-row">
            {viewed.tags.map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        </div>
        <Confirm
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="删除这一页日记？"
          action="删除日记"
          onConfirm={() => {
            deleteRecord(deleteId!);
            setDeleteId(null);
            setViewId(null);
          }}
        >
          <p>删除后无法直接撤回。重要记录可以先到“我的进度”导出完整备份。</p>
        </Confirm>
      </div>
    );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="MY LEARNING JOURNAL"
        title="每一次理解，都值得被记住"
        description="保存你的问题、牌面与当时的声音。以后回来，也能看见不同的自己。"
      >
        <button
          className="button primary"
          onClick={() => beginEdit(newEntry())}
        >
          <Plus size={16} />
          写一页学习日记
        </button>
      </PageTitle>
      <div className="journal-filters panel">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索学习日记"
            placeholder="搜索牌名、问题、关键词或心得…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="date-filters">
          <label>
            从
            <input
              aria-label="日记起始日期"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            至
            <input
              aria-label="日记结束日期"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="results-label">
        <span>{filtered.length} 篇日记</span>
        <span>你的思考，保存在此浏览器</span>
      </div>
      {filtered.length ? (
        <div className="journal-list">
          {filtered.map((r) => (
            <button
              className="journal-item panel"
              key={r.id}
              onClick={() => setViewId(r.id)}
            >
              <div className="journal-date">
                <strong>{r.date.slice(-2)}</strong>
                <span>{r.date.slice(0, 7)}</span>
              </div>
              <div className="journal-item-copy">
                <span className="journal-kind">
                  {r.kind === "reading" ? "解牌练习" : "学习随记"}
                </span>
                <h2>{r.title}</h2>
                <p>{r.reflection || r.interpretation || r.question}</p>
                <div className="journal-item-tags">
                  {r.cards.slice(0, 3).map((c) => (
                    <span key={c.cardId}>
                      {cardById[c.cardId]?.name}
                      {c.reversed ? "·逆位" : ""}
                    </span>
                  ))}
                  {r.tags.slice(0, 2).map((t, i) => (
                    <span key={i}>#{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title={
            q || from || to
              ? "没有找到符合条件的记录"
              : "这一页，等待你的第一笔"
          }
          description={
            q || from || to
              ? "换一个关键词或时间范围，再试试看。"
              : "可以记录今天学到的牌，也可以去实验室保存一次独立解牌。"
          }
        >
          {q || from || to ? (
            <button
              className="button secondary"
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
              }}
            >
              清除查询条件
            </button>
          ) : (
            <Link className="button secondary" to="/lab">
              开始一次解牌练习
              <ArrowRight size={15} />
            </Link>
          )}
        </Empty>
      )}
    </div>
  );
}
