import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Download,
  Flame,
  FolderHeart,
  ShieldCheck,
  Upload,
  Copy,
  X,
} from "lucide-react";
import {
  CardArt,
  Confirm,
  Empty,
  Notice,
  PageTitle,
  ProgressBar,
  SectionTitle,
} from "../components";
import { cardById, cards, statusLabels, suitInfo } from "../data/cards";
import { lessons } from "../data/courses";
import { academySources } from "../data/academy";
import type { LearningState, Suit } from "../data/types";
import {
  activityDays,
  dateKey,
  dueCards,
  migrateState,
  STORAGE_KEY,
  streak,
  weakCards,
} from "../lib/learning";
import { useLearning, useToday } from "../lib/store";
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: "application/json;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function Progress() {
  const { state, error, replace } = useLearning();
  const today = useToday();
  const location = useLocation();
  const [days, setDays] = useState(7);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<LearningState | null>(null);
  const [message, setMessage] = useState("");
  const [backupMade, setBackupMade] = useState(false);
  const textDialog = useRef<HTMLDialogElement>(null),
    textArea = useRef<HTMLTextAreaElement>(null);
  const [backupText, setBackupText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const backup = () => ({
    app: "tarot-academy",
    exportedAt: new Date().toISOString(),
    theme: document.documentElement.dataset.theme,
    data: state,
  });
  const showBackupText = () => {
    setBackupText(JSON.stringify(backup(), null, 2));
    setCopyMessage("");
    textDialog.current?.showModal();
  };
  const learned = cards.filter(
    (c) => state.cards[c.id]?.status && state.cards[c.id].status !== "new",
  ).length;
  const due = dueCards(state, today),
    weak = weakCards(state);
  const activity = activityDays(state, days, today),
    max = Math.max(1, ...activity.map((a) => a.value));
  const activeDays = activity.filter((d) => d.value > 0).length;
  const done = lessons.filter((l) => state.lessons[l.id]?.completedAt).length;
  useEffect(() => {
    if (location.hash === "#sources")
      document
        .getElementById("sources")
        ?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);
  const exportBackup = () => {
    downloadJson(backup(), `塔罗学院-学习备份-${today}.json`);
    setBackupMade(true);
    setMessage(
      "已发起备份下载，请确认文件已保存。若浏览器限制下载，可以使用“复制备份文本”。",
    );
  };
  const readFile = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("备份文件超过10MB，请检查文件是否正确。");
      const parsed = JSON.parse(await file.text());
      if (parsed && typeof parsed === "object" && "studio" in parsed)
        throw new Error(
          "这是含每日观察和照片的完整书房备份。请前往“每日生活日记”的备份与恢复入口导入，以一并恢复全部记录。",
        );
      const data = migrateState(parsed);
      setPending(data);
      setBackupMade(false);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "无法读取备份文件。");
    } finally {
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="progress-page page-enter">
      <PageTitle
        eyebrow="YOUR LEARNING INSIGHTS"
        title="走过的每一步，都在这里"
        description="用真实记录看见积累，也给不熟悉的知识多一点耐心。"
      />
      <div className="stats-grid">
        <div className="stat-box panel">
          <BookOpen />
          <strong>
            {learned}
            <span> / 78</span>
          </strong>
          <span>已学习的牌</span>
        </div>
        <div className="stat-box panel">
          <Flame />
          <strong>
            {streak(state, today)}
            <span> 天</span>
          </strong>
          <span>连续学习</span>
        </div>
        <div className="stat-box panel">
          <FolderHeart />
          <strong>
            {state.journal.length}
            <span> 篇</span>
          </strong>
          <span>日记与解牌练习</span>
        </div>
        <div className="stat-box panel">
          <Bookmark />
          <strong>
            {state.quizTotals.attempts
              ? `${Math.round((state.quizTotals.correct / state.quizTotals.attempts) * 100)}%`
              : "—"}
          </strong>
          <span>测验正确率 · {state.quizTotals.attempts}次答题</span>
        </div>
      </div>
      <div className="progress-columns">
        <section className="panel mastery-panel">
          <SectionTitle
            title="把熟悉，一点点积累"
            sub={`课程 ${done} / ${lessons.length} 节完成`}
          />
          <div className="mastery-summary">
            {Object.entries(statusLabels).map(([key, label]) => {
              const n = cards.filter(
                (c) => (state.cards[c.id]?.status || "new") === key,
              ).length;
              return (
                <Link key={key} to={`/cards?status=${key}`}>
                  <i className={`status-dot-indicator status-${key}`} />
                  <strong>{n}</strong>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="category-progress">
            {Object.entries(suitInfo).map(([suit, info]) => {
              const group = cards.filter((c) => c.suit === suit);
              const n = group.filter(
                (c) =>
                  state.cards[c.id]?.status &&
                  state.cards[c.id].status !== "new",
              ).length;
              return (
                <Link key={suit} to={`/cards?suit=${suit}`}>
                  <div>
                    <span>
                      {info.name}
                      <small>{info.english}</small>
                    </span>
                    <strong>
                      {n} / {group.length}
                    </strong>
                  </div>
                  <ProgressBar
                    value={(n / group.length) * 100}
                    label={`${info.name}已学习比例`}
                  />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="section-title">
            <div>
              <h2>日常的学习节奏</h2>
              <p>
                {days}天里，有{activeDays}天留下学习记录
              </p>
            </div>
            <div className="segmented small">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  className={days === n ? "active" : ""}
                  onClick={() => setDays(n)}
                >
                  {n}天
                </button>
              ))}
            </div>
          </div>
          <div
            className={`activity-chart days-${days}`}
            role="img"
            aria-label={`最近${days}天学习记录次数：${activity.map((d) => `${d.date} ${d.value}次`).join("；")}`}
          >
            {activity.map((d, i) => (
              <div
                className="activity-column"
                key={d.date}
                title={`${d.date}：${d.value}次学习记录`}
              >
                <div className="bar-area">
                  <span
                    style={{
                      height: `${d.value ? Math.max(4, (d.value / max) * 100) : 2}%`,
                    }}
                    className={d.value ? "has-activity" : ""}
                  />
                </div>
                <small>
                  {days === 7 || i % 5 === 0
                    ? d.date.slice(5).replace("-", "/")
                    : ""}
                </small>
              </div>
            ))}
          </div>
          <p className="chart-footnote">
            次数统计：标记学习、卡片自评、答题、完成课程和新建日记。不换算为学习时长。
          </p>
          <div className="activity-totals">
            <span>
              课程完成{" "}
              <strong>
                {activity.reduce((n, d) => n + (d.lessons || 0), 0)}
              </strong>
            </span>
            <span>
              练习答题{" "}
              <strong>
                {activity.reduce((n, d) => n + (d.quizzes || 0), 0)}
              </strong>
            </span>
            <span>
              新日记{" "}
              <strong>
                {activity.reduce((n, d) => n + (d.practices || 0), 0)}
              </strong>
            </span>
          </div>
        </section>
      </div>
      <section className="review-center panel">
        <SectionTitle
          title="该再遇见的那些牌"
          sub={`${due.length} 张到期 · ${weak.length} 张需要巩固`}
          to="/training?scope=due"
          label="开始到期复习"
        />
        {due.length ? (
          <div className="review-list">
            {due.slice(0, 8).map((c) => (
              <div key={c.id} className="review-item">
                <CardArt card={c} />
                <div>
                  <Link to={`/cards/${c.id}`}>
                    <strong>{c.name}</strong>
                  </Link>
                  <span>复习日期 {state.cards[c.id].due}</span>
                  <small>
                    答对 {state.cards[c.id].correct} /{" "}
                    {state.cards[c.id].attempts} · 答错{" "}
                    {state.cards[c.id].lapses} 次
                  </small>
                </div>
                <Link
                  className="button secondary"
                  to={`/training?card=${c.id}`}
                >
                  复习
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty">
            <span>✧</span>
            <div>
              <h3>此刻没有到期的卡片</h3>
              <p>开始一次测验或卡片自评，系统会为你安排下次见面的时间。</p>
            </div>
            <Link className="button secondary" to="/training">
              开始练习
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
        {weak.length > 0 && (
          <div className="weak-area">
            <h3>这些牌，再多看一眼</h3>
            <div className="weak-chips">
              {weak.slice(0, 12).map((c) => (
                <Link key={c.id} to={`/cards/${c.id}`}>
                  {c.name}
                  <ArrowRight size={12} />
                </Link>
              ))}
            </div>
            <Link className="text-link" to="/training?scope=weak">
              集中复习薄弱知识
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </section>
      <section className="backup-panel panel">
        <Notice>
          这里备份原有课程、牌义笔记和解牌档案。每日观察日记及照片使用独立数据库，请用
          <Link to="/daily?backup=1">完整书房备份与恢复 →</Link>一并保存。
        </Notice>
        <div className="backup-heading">
          <ShieldCheck size={27} />
          <div>
            <h2>让长期的积累，有一份备份</h2>
            <p>
              学习进度、牌义笔记、课程回答、解牌草稿和日记都保存在当前浏览器。清除网站数据或换设备后，需要导入备份恢复；不同网址的记录各自保存。
            </p>
          </div>
        </div>
        <div className="backup-actions">
          <button className="button primary" onClick={exportBackup}>
            <Download size={16} />
            导出完整学习备份
          </button>
          <button
            className="button secondary"
            onClick={() => input.current?.click()}
          >
            <Upload size={16} />
            导入 JSON 备份
          </button>
          <button className="button secondary" onClick={showBackupText}>
            <Copy size={16} />
            复制备份文本
          </button>
          {error && (
            <button
              className="button secondary"
              onClick={() => {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) downloadJson(raw, `塔罗学院-原始数据-${today}.json`);
                else setMessage("当前未找到原始存储数据。");
              }}
            >
              下载原始存储数据
            </button>
          )}
          <input
            className="sr-only"
            ref={input}
            type="file"
            accept="application/json,.json"
            aria-label="选择学习备份文件"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </div>
        {message && (
          <p className="backup-message" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="sources-panel" id="sources">
        <div className="eyebrow">SOURCES & OUR APPROACH</div>
        <h2>知识与图像，都保留来处</h2>
        <p>
          本课程是围绕常见现代 RWS
          框架自编的中文教学内容，视觉描述参考原始牌面，区别于历史书中具体的占断。符号可有多种解读，课程中会区分可见事实、解释与现实核实。
        </p>
        <div className="source-links">
          {academySources.map((source) => (
            <a
              href={source.url}
              key={source.url}
              target="_blank"
              rel="noreferrer"
              title={source.note}
            >
              {source.title} ↗
            </a>
          ))}
          <a
            href="https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot"
            target="_blank"
            rel="noreferrer"
          >
            A. E. Waite · The Pictorial Key to the Tarot ↗
          </a>
          <a
            href="https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck"
            target="_blank"
            rel="noreferrer"
          >
            原版 RWS 与现代重绘的版权区别 ↗
          </a>
          <a
            href="https://github.com/mixvlad/TarotCards/blob/main/SOURCES.md"
            target="_blank"
            rel="noreferrer"
          >
            1909 Pam-A 原版扫描的公版说明与出处 ↗
          </a>
          <a
            href={`${import.meta.env.BASE_URL}cards/sources.json`}
            target="_blank"
            rel="noreferrer"
          >
            查看本地图片逐张来源清单 ↗
          </a>
        </div>
        <p className="muted">
          牌面作者 Pamela Colman Smith；原出版 Rider & Company，1909。扫描修复
          Steve P.，通过标明公版的 TarotCards
          资料镜像保存；没有使用现代重绘、重新配色的商业牌组。站内所有牌面均本地提供。
        </p>
      </section>
      <Confirm
        open={!!pending}
        onClose={() => setPending(null)}
        title="用备份恢复学习数据？"
        action="确认恢复"
        onConfirm={() => {
          if (!pending) return;
          try {
            replace(pending);
            setMessage("备份已恢复，课程、笔记与日记已更新。");
            setPending(null);
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "恢复失败，原数据未改变。",
            );
          }
        }}
      >
        <p>这会覆盖当前浏览器中的学习数据。请先导出当前记录，再确认恢复。</p>
        {pending && (
          <p>
            备份包含 {Object.keys(pending.cards).length} 张牌的状态、
            {Object.keys(pending.lessons).length} 节课程记录与{" "}
            {pending.journal.length} 篇日记。
          </p>
        )}
        <button className="button secondary" onClick={exportBackup}>
          <Download size={15} />
          {backupMade ? "已发起下载，可再次导出" : "先导出当前记录"}
        </button>
      </Confirm>
      <dialog
        ref={textDialog}
        className="modal backup-text-modal"
        aria-labelledby="backup-text-title"
      >
        <div className="modal-top">
          <h2 id="backup-text-title">完整的学习备份</h2>
          <button
            className="icon-button"
            aria-label="关闭备份文本"
            onClick={() => textDialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <p>
          可以复制下方完整文本，粘贴到文本编辑器，保存为 UTF-8 编码的 .json
          文件，再通过“导入 JSON 备份”恢复。
        </p>
        <textarea
          ref={textArea}
          aria-label="完整学习备份文本"
          value={backupText}
          readOnly
          spellCheck={false}
        />
        <p className="muted" role="status">
          {copyMessage}
        </p>
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={() => {
              textArea.current?.focus();
              textArea.current?.select();
              setCopyMessage("文本已全选，可使用 Ctrl+C，或在手机上长按复制。");
            }}
          >
            全选文本
          </button>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(backupText);
                setCopyMessage("完整备份已复制到剪贴板。");
              } catch {
                textArea.current?.focus();
                textArea.current?.select();
                setCopyMessage("已选中完整文本，请按 Ctrl+C 或长按复制。");
              }
            }}
          >
            <Copy size={15} />
            复制完整文本
          </button>
        </div>
      </dialog>
    </div>
  );
}
