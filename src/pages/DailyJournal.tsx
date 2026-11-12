import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  ImagePlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { CardArt, Confirm, Empty, Notice, PageTitle } from "../components";
import { cards, cardById } from "../data/cards";
import { dateKey, validDate } from "../lib/learning";
import { useLearning } from "../lib/store";
import {
  compressDiaryPhoto,
  congruenceLabels,
  DailyConflictError,
  dailyVersion,
  deleteDaily,
  diaryCsv,
  diaryText,
  downloadDiary,
  getDaily,
  lifeTopics,
  listDaily,
  newDaily,
  parseStudioBackup,
  replaceDailyEntries,
  saveDaily,
  studioBackup,
  type Congruence,
  type DailyEntry,
  type DailyPhoto,
} from "../lib/daily";
import "../daily.css";

const emotions = [
  "平静",
  "期待",
  "愉快",
  "低落",
  "焦虑",
  "生气",
  "疲惫",
  "感激",
  "迷茫",
];
const describeError = (e: unknown) =>
  e instanceof Error ? e.message : "操作未完成，请重试；已有记录没有被清空。";
type PendingBackup = ReturnType<typeof parseStudioBackup>;

export function DailyJournal() {
  const { state, replace } = useLearning();
  const location = useLocation(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const history = location.pathname.endsWith("/history");
  const [entry, setEntry] = useState<DailyEntry | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [view, setView] = useState<"timeline" | "calendar" | "table">(
    "timeline",
  );
  const [q, setQ] = useState(""),
    [cardFilter, setCardFilter] = useState(""),
    [emotionFilter, setEmotionFilter] = useState(""),
    [topicFilter, setTopicFilter] = useState(""),
    [fitFilter, setFitFilter] = useState("");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [month, setMonth] = useState(dateKey().slice(0, 7));
  const [deleteOpen, setDeleteOpen] = useState(false),
    [reloadOpen, setReloadOpen] = useState(false),
    [pending, setPending] = useState<PendingBackup | null>(null);
  const current = useRef<DailyEntry | null>(null),
    dirty = useRef(false),
    conflicted = useRef(false),
    alive = useRef(true),
    revision = useRef(0),
    loadToken = useRef(0);
  const saving = useRef<Promise<unknown>>(Promise.resolve()),
    timer = useRef<number | undefined>(undefined);
  const baseline = useRef<{ version: string | null }>({ version: null });
  const diaryMutation = useRef(false);
  const backupInput = useRef<HTMLInputElement>(null),
    photoInput = useRef<HTMLInputElement>(null);

  function installEntry(saved: DailyEntry | null, date: string) {
    const next = saved || newDaily(date);
    baseline.current = { version: dailyVersion(saved) };
    current.current = next;
    dirty.current = false;
    conflicted.current = false;
    revision.current++;
    setEntry(next);
    setConflict(false);
  }
  function enqueueSave(snapshot: DailyEntry): Promise<DailyEntry> {
    // Every write to this open editor advances the same baseline in queue order.
    const base = baseline.current;
    const job = saving.current.then(async () => {
      const saved = await saveDaily(snapshot, base.version);
      base.version = dailyVersion(saved);
      return saved;
    });
    saving.current = job.catch(() => {});
    return job;
  }
  function reportWriteError(e: unknown) {
    if (e instanceof DailyConflictError) {
      conflicted.current = true;
      setConflict(true);
      setMessage("");
      setDeleteOpen(false);
      setPending(null);
    }
    setError(describeError(e));
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
      const snapshot = current.current;
      if (
        dirty.current &&
        snapshot &&
        !diaryMutation.current &&
        !conflicted.current
      )
        void enqueueSave(snapshot).catch(() => {});
    };
  }, []);
  const refreshHistory = async () => {
    try {
      const all = await listDaily(false);
      if (alive.current) setEntries(all);
    } catch (e) {
      if (alive.current) setError(describeError(e));
    }
  };
  async function persist(
    snapshot = current.current,
    manual = false,
  ): Promise<DailyEntry | null> {
    if (!snapshot || diaryMutation.current || conflicted.current) return null;
    window.clearTimeout(timer.current);
    const number = revision.current;
    const value = {
      ...snapshot,
      savedAt: manual ? new Date().toISOString() : snapshot.savedAt,
    };
    setBusy(true);
    setError("");
    try {
      const saved = await enqueueSave(value);
      if (
        alive.current &&
        current.current?.id === value.id &&
        revision.current === number
      ) {
        dirty.current = false;
        current.current = saved;
        setEntry(saved);
        setMessage(
          manual
            ? "这一页已保存，早晨与晚间记录都留在这里。"
            : "草稿已自动保存",
        );
      }
      return saved;
    } catch (e) {
      if (alive.current) reportWriteError(e);
      return null;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const chosenDate = validDate(params.get("date"))
    ? params.get("date")!
    : dateKey();
  useEffect(() => {
    const token = ++loadToken.current;
    const load = async () => {
      setLoading(true);
      if (conflicted.current) {
        setLoading(false);
        return;
      }
      setError("");
      if (
        dirty.current &&
        current.current &&
        current.current.date !== chosenDate
      ) {
        const saved = await persist();
        if (!saved) {
          if (alive.current && token === loadToken.current) setLoading(false);
          return;
        }
      }
      try {
        const saved = await getDaily(chosenDate);
        if (alive.current && token === loadToken.current) {
          installEntry(saved, chosenDate);
          setMessage(
            saved
              ? saved.savedAt
                ? "已打开保存的日记，可继续补写。"
                : "已恢复尚未完成的草稿。"
              : "不必写完整，先留下今天的一点感受。",
          );
        }
      } catch (e) {
        if (alive.current && token === loadToken.current)
          setError(describeError(e));
      } finally {
        if (alive.current && token === loadToken.current) setLoading(false);
      }
    };
    void load();
  }, [chosenDate]);
  useEffect(() => {
    if (history)
      void (async () => {
        if (dirty.current && !(await persist())) return;
        await refreshHistory();
      })();
  }, [history]);
  useEffect(() => {
    if (!entry || loading || !dirty.current || conflicted.current) return;
    timer.current = window.setTimeout(() => void persist(entry), 500);
    return () => window.clearTimeout(timer.current);
  }, [entry, loading]);
  useEffect(() => {
    const flush = () => {
      if (
        document.visibilityState === "hidden" &&
        dirty.current &&
        current.current
      )
        void persist();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);
  useEffect(() => {
    if (!conflict) return;
    const keepDraft = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", keepDraft);
    return () => window.removeEventListener("beforeunload", keepDraft);
  }, [conflict]);
  const edit = (change: (e: DailyEntry) => void) => {
    if (!current.current || loading || !alive.current || diaryMutation.current)
      return;
    const next = structuredClone(current.current);
    change(next);
    next.updatedAt = new Date().toISOString();
    revision.current++;
    dirty.current = true;
    current.current = next;
    setEntry(next);
    if (!conflicted.current) setMessage("正在保存草稿…");
  };
  const selectDate = async (date: string) => {
    if (!validDate(date) || conflicted.current) return;
    if (dirty.current && !(await persist())) return;
    setParams({ date });
  };
  const openEntry = async (date: string) => {
    if (conflicted.current) return;
    if (dirty.current && !(await persist())) return;
    navigate(`/daily?date=${date}`);
  };
  const leaveEditor = (event: MouseEvent<HTMLAnchorElement>, destination: string) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (conflicted.current || dirty.current) {
      event.preventDefault();
      if (!conflicted.current)
        void persist().then((saved) => {
          if (saved) navigate(destination);
        });
    }
  };
  const exportCurrentText = () => {
    const snapshot = current.current;
    if (snapshot)
      downloadDiary(
        diaryText(snapshot),
        `塔罗生活观察-${snapshot.date}.txt`,
      );
  };
  const exportConflictDraft = () => {
    const snapshot = current.current;
    if (snapshot)
      downloadDiary(
        JSON.stringify(snapshot, null, 2),
        `塔罗生活观察-未保存草稿-${snapshot.date}.json`,
        "application/json;charset=utf-8",
      );
  };
  async function reloadCurrent() {
    const date = current.current?.date;
    if (!date || diaryMutation.current) return;
    diaryMutation.current = true;
    setBusy(true);
    try {
      await saving.current;
      const latest = await getDaily(date);
      installEntry(latest, date);
      setError("");
      setMessage(
        latest ? "已打开这一天当前保存的日记。" : "这一天目前没有已保存的日记。",
      );
      if (history || date !== chosenDate) navigate(`/daily?date=${date}`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      diaryMutation.current = false;
      setBusy(false);
      setReloadOpen(false);
    }
  }
  async function exportAll() {
    try {
      if (dirty.current && !conflicted.current && !(await persist())) return;
      const all = await listDaily();
      downloadDiary(
        JSON.stringify(studioBackup(state, all), null, 2),
        `塔罗书房-完整备份-${dateKey()}.json`,
        "application/json;charset=utf-8",
      );
      setMessage(
        "已发起完整备份下载，包含照片、事前版本和原有学习记录。请确认文件已保存。",
      );
    } catch (e) {
      setError(describeError(e));
    }
  }
  async function readBackup(file?: File) {
    if (!file || conflicted.current) return;
    try {
      const parsed = parseStudioBackup(JSON.parse(await file.text()));
      if (conflicted.current) return;
      setPending(parsed);
      setError("");
    } catch (e) {
      setError(describeError(e));
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
  }
  async function restoreBackup() {
    if (!pending || diaryMutation.current || conflicted.current) return;
    diaryMutation.current = true;
    setBusy(true);
    window.clearTimeout(timer.current);
    await saving.current;
    try {
      if (conflicted.current) return;
      if (pending.entries === null) {
        // A learning-only backup does not replace this diary or its pending edits.
        if (dirty.current && current.current) {
          const saved = await enqueueSave(current.current);
          current.current = saved;
          dirty.current = false;
          setEntry(saved);
        }
        replace(pending.learning);
        setPending(null);
        await refreshHistory();
        setMessage("旧版学习记录已恢复。当前日记和照片已保留。");
        setError("");
        return;
      }
      const previous = await listDaily();
      await replaceDailyEntries(pending.entries);
      try {
        replace(pending.learning);
      } catch (e) {
        await replaceDailyEntries(previous, true);
        throw e;
      }
      const restored = await getDaily(chosenDate);
      installEntry(restored, chosenDate);
      setPending(null);
      await refreshHistory();
      setMessage("备份已恢复。原课程、笔记和书房日记均已更新。");
      setError("");
    } catch (e) {
      reportWriteError(e);
    } finally {
      diaryMutation.current = false;
      setBusy(false);
    }
  }
  async function removeEntry() {
    if (!entry || diaryMutation.current || conflicted.current) return;
    diaryMutation.current = true;
    setBusy(true);
    window.clearTimeout(timer.current);
    await saving.current;
    try {
      await deleteDaily(entry.id, baseline.current.version);
      installEntry(null, entry.date);
      setDeleteOpen(false);
      await refreshHistory();
      setMessage("这一页已删除。再次写入内容才会建立新记录。");
      setError("");
    } catch (e) {
      reportWriteError(e);
    } finally {
      diaryMutation.current = false;
      setBusy(false);
    }
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length || !entry) return;
    setPhotoBusy(true);
    setError("");
    try {
      if (entry.photos.length + files.length > 6)
        throw new Error("每篇最多添加6张照片。");
      const originalId = entry.id;
      const pictures: DailyPhoto[] = [];
      for (const file of Array.from(files))
        pictures.push(await compressDiaryPhoto(file));
      if (current.current?.id !== originalId)
        throw new Error(
          "日期已改变，照片未被放入另一篇日记。请在需要的日期重新添加。",
        );
      edit((e) => {
        e.photos.push(...pictures);
      });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }
  const filtered = entries.filter(
    (e) =>
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (!cardFilter || e.morning.drawn?.cardId === cardFilter) &&
      (!emotionFilter || e.evening.emotions.includes(emotionFilter)) &&
      (!topicFilter || e.evening.topics.includes(topicFilter)) &&
      (!fitFilter || e.tarot.congruence === fitFilter) &&
      diaryText(e).toLowerCase().includes(q.trim().toLowerCase()),
  );
  const drawn = entry?.morning.drawn;
  const area = (
    label: string,
    value: string,
    set: (e: DailyEntry, value: string) => void,
    placeholder = "",
  ) => (
    <label className="field daily-field">
      {label}
      <textarea
        value={value}
        maxLength={20000}
        placeholder={placeholder}
        onChange={(event) => edit((e) => set(e, event.target.value))}
      />
    </label>
  );
  const monthStart = new Date(`${month}-01T12:00:00`),
    monthLength = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate();
  const calendarEntries = new Map(
    filtered.filter((e) => e.date.startsWith(month)).map((e) => [e.date, e]),
  );
  return (
    <div className="daily-page page-enter">
      <Link className="back-link" to="/" onClick={(e) => leaveEditor(e, "/")}>
        <ArrowLeft size={14} />
        返回书房
      </Link>
      <PageTitle
        eyebrow="A PAGE OF YOUR OWN"
        title={history ? "生活留下的页码" : "每日塔罗生活观察"}
        description="早晨留一个观察的起点，晚上写下真实发生的生活。不需要让它们吻合。"
      />
      <nav className="daily-navigation" aria-label="每日记录导航">
        <Link
          className={!history ? "active" : ""}
          to={`/daily?date=${chosenDate}`}
        >
          <BookOpen size={16} />
          写这一页
        </Link>
        <Link
          className={history ? "active" : ""}
          to="/daily/history"
          onClick={(e) => leaveEditor(e, "/daily/history")}
        >
          <CalendarDays size={16} />
          日记历史
        </Link>
        <Link to="/journal" onClick={(e) => leaveEditor(e, "/journal")}>
          解牌记录
          <ArrowRight size={14} />
        </Link>
        <Link to="/reflection" onClick={(e) => leaveEditor(e, "/reflection")}>
          自我觉察
        </Link>
      </nav>
      <div className="daily-backup-row">
        <button
          className="text-link"
          onClick={exportAll}
          disabled={busy || photoBusy}
        >
          <Download size={14} />
          完整书房JSON备份
        </button>
        <button
          className="text-link"
          onClick={() => backupInput.current?.click()}
          disabled={busy || photoBusy || conflict}
        >
          <Upload size={14} />
          导入JSON备份
        </button>
        <input
          ref={backupInput}
          hidden
          type="file"
          accept="application/json,.json"
          aria-label="选择书房备份文件"
          onChange={(e) => void readBackup(e.target.files?.[0])}
        />
        <small>照片与日记只保存在此浏览器，不会公开上传。</small>
      </div>
      {(error || conflict) && (
        <div className="daily-error" role="alert">
          {error}
          {conflict ? (
            <>
              <button className="text-link" onClick={exportConflictDraft}>
                导出当前草稿（含照片）
              </button>
              <button
                className="text-link"
                disabled={busy || photoBusy}
                onClick={() => setReloadOpen(true)}
              >
                读取当前保存的版本
              </button>
            </>
          ) : (
            <button
              className="text-link"
              onClick={() => {
                if (dirty.current) {
                  void persist();
                  return;
                }
                if (history) void refreshHistory();
                else
                  void getDaily(chosenDate)
                    .then((value) => {
                      installEntry(value, chosenDate);
                      setLoading(false);
                      setError("");
                    })
                    .catch((e) => setError(describeError(e)));
              }}
            >
              {dirty.current ? "重试保存草稿" : "重试读取"}
            </button>
          )}
        </div>
      )}
      {message && (
        <p className="daily-message" role="status">
          {busy ? "正在保存…" : message}
        </p>
      )}
      {history ? (
        <>
          <section className="daily-history-tools panel">
            <label className="field">
              搜索日记
              <input
                value={q}
                aria-label="搜索每日日记"
                placeholder="事件、感受或关键词"
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <div className="daily-filter-grid">
              <label className="field">
                开始日期
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="field">
                结束日期
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <label className="field">
                卡牌
                <select
                  value={cardFilter}
                  onChange={(e) => setCardFilter(e.target.value)}
                >
                  <option value="">全部卡牌</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                情绪
                <select
                  value={emotionFilter}
                  onChange={(e) => setEmotionFilter(e.target.value)}
                >
                  <option value="">全部情绪</option>
                  {[
                    ...new Set([
                      ...emotions,
                      ...entries.flatMap((e) => e.evening.emotions),
                    ]),
                  ].map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                生活主题
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                >
                  <option value="">全部主题</option>
                  {lifeTopics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                契合程度
                <select
                  value={fitFilter}
                  onChange={(e) => setFitFilter(e.target.value)}
                >
                  <option value="">全部程度</option>
                  {Object.entries(congruenceLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="daily-view-controls">
              <div className="segmented">
                {(
                  [
                    ["timeline", "时间轴"],
                    ["calendar", "日历"],
                    ["table", "表格"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={view === value ? "active" : ""}
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  downloadDiary(
                    diaryCsv(filtered),
                    `塔罗生活观察-${dateKey()}.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={15} />
                导出筛选结果CSV
              </button>
            </div>
            <p className="muted">
              {filtered.length}篇记录 · 草稿也可以继续补写
            </p>
          </section>
          {view === "calendar" ? (
            <section className="daily-calendar panel">
              <label className="field">
                选择月份
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    if (/^\d{4}-\d{2}$/.test(e.target.value))
                      setMonth(e.target.value);
                  }}
                />
              </label>
              <div className="daily-calendar-grid">
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <span className="calendar-weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: monthStart.getDay() }, (_, i) => (
                  <span key={`blank-${i}`} />
                ))}
                {Array.from({ length: monthLength }, (_, i) => {
                  const date = `${month}-${String(i + 1).padStart(2, "0")}`,
                    record = calendarEntries.get(date);
                  return (
                    <button
                      key={date}
                      className={record ? "has-entry" : ""}
                      onClick={() => void openEntry(date)}
                      aria-label={`${date}${record ? "，有日记" : "，新建日记"}`}
                    >
                      <strong>{i + 1}</strong>
                      {record ? (
                        <small>
                          {record.morning.drawn
                            ? cardById[record.morning.drawn.cardId].name
                            : "生活随记"}
                        </small>
                      ) : (
                        <small>＋</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : !filtered.length ? (
            <Empty
              title="这里还留着空白"
              description="可以写今天，也可以补写之前某一天。没有每日必须完成的任务。"
            >
              <button
                className="button primary"
                onClick={() => void openEntry(dateKey())}
              >
                写今天的日记
              </button>
            </Empty>
          ) : view === "table" ? (
            <div className="daily-table-wrap panel">
              <table className="daily-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>卡牌</th>
                    <th>生活主题</th>
                    <th>契合程度</th>
                    <th>留下一句话</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => void openEntry(e.date)}
                        >
                          {e.date}
                        </button>
                      </td>
                      <td>
                        {e.morning.drawn
                          ? `${cardById[e.morning.drawn.cardId].name}·${e.morning.drawn.reversed ? "逆位" : "正位"}`
                          : "未关联"}
                      </td>
                      <td>{e.evening.topics.join("、") || "—"}</td>
                      <td>{congruenceLabels[e.tarot.congruence]}</td>
                      <td>
                        {(
                          e.awareness.remember ||
                          e.evening.memorable ||
                          e.morning.focus
                        ).slice(0, 80) || "草稿"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="daily-timeline">
              {filtered.map((e) => (
                <button
                  className="daily-history-card panel"
                  key={e.id}
                  onClick={() => void openEntry(e.date)}
                >
                  {e.morning.drawn ? (
                    <CardArt
                      card={cardById[e.morning.drawn.cardId]}
                      reversed={e.morning.drawn.reversed}
                    />
                  ) : (
                    <span className="daily-empty-card">✎</span>
                  )}
                  <span>
                    <small>
                      {e.date} · {e.savedAt ? "已保存" : "草稿"}
                    </small>
                    <strong>
                      {e.awareness.remember ||
                        e.evening.memorable ||
                        e.morning.focus ||
                        "给这一天留一点空间"}
                    </strong>
                    <p>
                      {(e.evening.events || e.morning.interpretation).slice(
                        0,
                        140,
                      )}
                    </p>
                    <em>
                      {e.evening.emotions.join(" · ")}{" "}
                      {e.evening.topics.join(" · ")}
                    </em>
                  </span>
                  <span className="daily-fit-label">
                    {congruenceLabels[e.tarot.congruence]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : loading || !entry ? (
        <section className="panel daily-loading">
          {error ? "暂时无法读取日记，请使用上方重试。" : "正在打开这一页…"}
        </section>
      ) : (
        <>
          <div className="daily-date-row">
            <label className="field">
              这一页的日期
              <input
                type="date"
                aria-label="每日日记日期"
                value={entry.date}
                onChange={(e) => void selectDate(e.target.value)}
              />
            </label>
            <span>早晨与晚间写在同一天 · 所有文字都可选填</span>
            <button
              className="button secondary"
              onClick={() => void selectDate(dateKey())}
            >
              回到今天
            </button>
          </div>
          <article className="daily-notebook">
            <section className="daily-paper morning-page">
              <div className="eyebrow">01 · MORNING OBSERVATION</div>
              <h2>早晨，给今天留一个观察的起点</h2>
              <div className="daily-morning-layout">
                <div className="daily-card-slot">
                  {drawn ? (
                    <>
                      <CardArt
                        card={cardById[drawn.cardId]}
                        reversed={drawn.reversed}
                      />
                      <strong>{cardById[drawn.cardId].name}</strong>
                      <small>
                        {drawn.reversed ? "逆位 Reversed" : "正位 Upright"}
                      </small>
                      <Link className="text-link" to={`/cards/${drawn.cardId}`}>
                        深入这张牌 →
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="daily-card-placeholder">
                        ✧<small>还没有关联卡牌</small>
                      </div>
                      <Link className="button primary" to="/lab?daily=1">
                        去桌边亲手选牌
                      </Link>
                    </>
                  )}
                  <details className="daily-manual-card">
                    <summary>关联实体牌／补写已抽到的牌</summary>
                    <label className="field">
                      选择卡牌
                      <select
                        aria-label="关联每日卡牌"
                        value={drawn?.cardId || ""}
                        onChange={(e) =>
                          edit((x) => {
                            x.morning.drawn = e.target.value
                              ? {
                                  cardId: e.target.value,
                                  reversed: x.morning.drawn?.reversed || false,
                                  position: "每日观察",
                                }
                              : null;
                          })
                        }
                      >
                        <option value="">暂不关联</option>
                        {cards.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={drawn?.reversed || false}
                        disabled={!drawn}
                        onChange={(e) =>
                          edit((x) => {
                            if (x.morning.drawn)
                              x.morning.drawn.reversed = e.target.checked;
                          })
                        }
                      />
                      逆位
                    </label>
                    <small>
                      这里仅记录你实际抽到的实体牌，不会生成随机结果。
                    </small>
                  </details>
                </div>
                <div>
                  {area(
                    "我当时想探索的问题",
                    entry.morning.question,
                    (e, v) => (e.morning.question = v),
                    "例如：今天我可以留意怎样的相处方式？",
                  )}
                  {area(
                    "我的初步解读",
                    entry.morning.interpretation,
                    (e, v) => (e.morning.interpretation = v),
                    "先写看到的画面，再写可能的象征。",
                  )}
                  {area(
                    "今天想关注的主题",
                    entry.morning.focus,
                    (e, v) => (e.morning.focus = v),
                  )}
                  {area(
                    "事前想法或预测（可选）",
                    entry.morning.prediction,
                    (e, v) => (e.morning.prediction = v),
                    "如果想写预期，可以保留；它不是当天必须发生的结果。",
                  )}
                  <small className="daily-footnote">
                    事前文字改动会追加时间版本，原文不会被后来的解释覆盖。
                  </small>
                  {entry.predictionVersions.length > 0 && (
                    <details className="daily-versions">
                      <summary>
                        查看事前文字版本（{entry.predictionVersions.length}）
                      </summary>
                      <ol>
                        {entry.predictionVersions.map((v, i) => (
                          <li key={i}>
                            <time>
                              {new Date(v.at).toLocaleString("zh-CN")}
                            </time>
                            <p>
                              {v.prediction ||
                                "（本次清空了文字，之前的版本仍保留）"}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              </div>
            </section>
            <section className="daily-paper">
              <div className="eyebrow">02 · EVENING, AS IT WAS</div>
              <h2>晚上，写真实发生的生活</h2>
              {area(
                "今天发生了什么？",
                entry.evening.events,
                (e, v) => (e.evening.events = v),
                "不必先寻找牌义，只写发生的事。",
              )}
              {area(
                "今天最值得记录的事情",
                entry.evening.memorable,
                (e, v) => (e.evening.memorable = v),
              )}
              {area(
                "今天有哪些情绪和感受？",
                entry.evening.feelings,
                (e, v) => (e.evening.feelings = v),
              )}
              <fieldset className="daily-tags">
                <legend>情绪标签（可选）</legend>
                {emotions.map((tag) => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={entry.evening.emotions.includes(tag)}
                      onChange={(event) =>
                        edit((e) => {
                          e.evening.emotions = event.target.checked
                            ? [...e.evening.emotions, tag]
                            : e.evening.emotions.filter((t) => t !== tag);
                        })
                      }
                    />
                    {tag}
                  </label>
                ))}
              </fieldset>
              <fieldset className="daily-tags">
                <legend>生活主题（可选）</legend>
                {lifeTopics.map((tag) => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={entry.evening.topics.includes(tag)}
                      onChange={(event) =>
                        edit((e) => {
                          e.evening.topics = event.target.checked
                            ? [...e.evening.topics, tag]
                            : e.evening.topics.filter((t) => t !== tag);
                        })
                      }
                    />
                    {tag}
                  </label>
                ))}
              </fieldset>
              <div className="daily-photo-heading">
                <h3>给这一天留一张照片</h3>
                <button
                  className="button secondary"
                  disabled={photoBusy || entry.photos.length >= 6}
                  onClick={() => photoInput.current?.click()}
                >
                  <ImagePlus size={16} />
                  {photoBusy ? "正在处理照片…" : "添加照片"}
                </button>
                <input
                  ref={photoInput}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="添加日记照片"
                  onChange={(e) => void addPhotos(e.target.files)}
                />
              </div>
              <p className="daily-footnote">
                最多6张，照片会在本机缩小并去掉原文件元数据；完整备份包含照片。
              </p>
              <div className="daily-photos">
                {entry.photos.map((photo) => (
                  <figure key={photo.id}>
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption || "这一页的生活照片"}
                    />
                    <input
                      aria-label="照片说明"
                      placeholder="给照片留一句话（可选）"
                      maxLength={5000}
                      value={photo.caption}
                      onChange={(event) =>
                        edit((e) => {
                          const p = e.photos.find((p) => p.id === photo.id);
                          if (p) p.caption = event.target.value;
                        })
                      }
                    />
                    <button
                      className="icon-button"
                      aria-label="移除这张照片"
                      onClick={() =>
                        edit((e) => {
                          e.photos = e.photos.filter((p) => p.id !== photo.id);
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            </section>
            <section className="daily-paper">
              <div className="eyebrow">03 · COMPARE WITHOUT FORCING</div>
              <h2>牌面与生活，也可以没有关系</h2>
              <label className="field">
                今天的契合程度
                <select
                  aria-label="日记契合程度"
                  value={entry.tarot.congruence}
                  onChange={(event) =>
                    edit(
                      (e) =>
                        (e.tarot.congruence = event.target.value as Congruence),
                    )
                  }
                >
                  {Object.entries(congruenceLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {area(
                "哪些地方符合？",
                entry.tarot.matches,
                (e, v) => (e.tarot.matches = v),
              )}
              {area(
                "哪些地方不符合？",
                entry.tarot.differences,
                (e, v) => (e.tarot.differences = v),
                "完全不符合也可以直接写下来。",
              )}
              {area(
                "有没有事后联想或选择性记忆？",
                entry.tarot.hindsight,
                (e, v) => (e.tarot.hindsight = v),
                "比较早晨的原文：哪些联系是事情发生后才补上的？",
              )}
              <Notice>
                不契合和不评价都是完整有效的记录。这里不是预测准确率测试，也不根据契合程度给你打分。
              </Notice>
              {entry.morning.reference && (
                <details className="daily-versions">
                  <summary>抽牌时保存的参考快照</summary>
                  <p className="daily-reference">{entry.morning.reference}</p>
                </details>
              )}
            </section>
            <section className="daily-paper">
              <div className="eyebrow">04 · A LITTLE SELF-AWARENESS</div>
              <h2>把想记住的，留给以后的自己</h2>
              {area(
                "今天对自己有什么新的认识？",
                entry.awareness.discovery,
                (e, v) => (e.awareness.discovery = v),
              )}
              {area(
                "有什么想继续讨论的问题？",
                entry.awareness.question,
                (e, v) => (e.awareness.question = v),
              )}
              {area(
                "希望记住今天的什么事情？",
                entry.awareness.remember,
                (e, v) => (e.awareness.remember = v),
              )}
              <div className="daily-save-row">
                <button
                  className="button primary"
                  disabled={busy || photoBusy || conflict}
                  onClick={() => void persist(current.current, true)}
                >
                  <Save size={16} />
                  {busy ? "正在保存…" : "保存这一页"}
                </button>
                <button
                  className="button secondary"
                  onClick={exportCurrentText}
                >
                  <Download size={15} />
                  导出这一页文本
                </button>
                <button
                  className="text-link daily-delete"
                  disabled={busy || photoBusy || conflict}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={14} />
                  删除这一页
                </button>
              </div>
              <small className="daily-footnote">
                草稿自动保存在此浏览器。电脑、手机和不同网址各自保存，请定期导出完整JSON备份。
              </small>
            </section>
          </article>
        </>
      )}
      <Confirm
        open={deleteOpen || !!pending || reloadOpen}
        title={
          reloadOpen
            ? "读取当前保存的日记？"
            : deleteOpen
              ? "删除这一天的记录？"
              : "用备份恢复书房？"
        }
        action={
          busy
            ? "正在处理…"
            : reloadOpen
              ? "放弃此处改动并读取"
              : deleteOpen
                ? "删除这一天"
                : "确认恢复"
        }
        onClose={() => {
          if (!busy) {
            setDeleteOpen(false);
            setReloadOpen(false);
            setPending(null);
          }
        }}
        onConfirm={() => {
          if (busy) return;
          if (reloadOpen) void reloadCurrent();
          else if (deleteOpen) void removeEntry();
          else void restoreBackup();
        }}
      >
        {reloadOpen ? (
          <>
            <p>
              读取保存的版本会丢弃当前页面尚未保存的改动。可以先导出带照片的草稿，留作核对。
            </p>
            <button className="button secondary" onClick={exportConflictDraft}>
              先导出当前草稿
            </button>
          </>
        ) : deleteOpen ? (
          <p>
            这会删除 {entry?.date}{" "}
            的早晚记录、照片与事前文字版本。其他日期、原有练习日记和学习进度不受影响。
          </p>
        ) : (
          <>
            <p>
              恢复会覆盖当前学习记录
              {pending?.entries !== null ? "和每日书房记录" : ""}
              。先导出当前完整备份，再确认恢复。
            </p>
            <p>
              {pending?.entries === null
                ? "这个旧版备份只有学习记录，当前每日书房日记会保留。"
                : `备份包含${pending?.entries.length || 0}篇每日日记及其照片和事前版本。`}
            </p>
            <button className="button secondary" onClick={exportAll}>
              先导出当前完整备份
            </button>
            {error && (
              <p className="daily-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Confirm>
    </div>
  );
}
