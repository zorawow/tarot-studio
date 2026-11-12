import { cardById } from "../data/cards.ts";
import type { DrawnCard, LearningState } from "../data/types.ts";
import { dateKey, validDate, recordId, migrateState } from "./learning.ts";

export type Congruence = "high" | "partial" | "low" | "none" | "skip";
export const congruenceLabels: Record<Congruence, string> = {
  high: "高度契合",
  partial: "部分契合",
  low: "不太契合",
  none: "完全不契合",
  skip: "不评价",
};
export const lifeTopics = [
  "亲密关系",
  "友谊",
  "职业探索",
  "家庭关系",
  "自由与稳定",
  "情绪与压力",
  "兴趣与成长",
  "理想生活",
  "自我认识",
];
export interface DailyPhoto {
  id: string;
  dataUrl: string;
  caption: string;
}
export interface PredictionVersion {
  at: string;
  prediction: string;
}
export interface DailyEntry {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  storageVersion?: string;
  savedAt: string | null;
  morning: {
    drawn: DrawnCard | null;
    question: string;
    interpretation: string;
    focus: string;
    prediction: string;
    reference: string;
  };
  evening: {
    events: string;
    memorable: string;
    feelings: string;
    emotions: string[];
    topics: string[];
  };
  tarot: {
    congruence: Congruence;
    matches: string;
    differences: string;
    hindsight: string;
  };
  awareness: { discovery: string; question: string; remember: string };
  photos: DailyPhoto[];
  predictionVersions: PredictionVersion[];
}
export function newDaily(date = dateKey()): DailyEntry {
  if (!validDate(date)) throw new Error("请选择有效日期。");
  const now = new Date().toISOString();
  return {
    id: `daily-${date}`,
    date,
    createdAt: now,
    updatedAt: now,
    savedAt: null,
    morning: {
      drawn: null,
      question: "",
      interpretation: "",
      focus: "",
      prediction: "",
      reference: "",
    },
    evening: {
      events: "",
      memorable: "",
      feelings: "",
      emotions: [],
      topics: [],
    },
    tarot: { congruence: "skip", matches: "", differences: "", hindsight: "" },
    awareness: { discovery: "", question: "", remember: "" },
    photos: [],
    predictionVersions: [],
  };
}

export class DailyConflictError extends Error {
  constructor() {
    super("这一天的日记已在其他页面保存、删除或恢复。当前页面的内容仍可导出。");
    this.name = "DailyConflictError";
  }
}

export function dailyVersion(entry: DailyEntry | null): string | null {
  return entry ? entry.storageVersion ?? entry.updatedAt : null;
}

const newStoredVersion = (entry: DailyEntry): DailyEntry => ({
  ...entry,
  storageVersion: recordId(),
});

function checkDailyVersion(entry: DailyEntry | null, expected?: string | null) {
  if (expected !== undefined && dailyVersion(entry) !== expected)
    throw new DailyConflictError();
}
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown, max = 50000): x is string =>
  typeof x === "string" && x.length <= max;
const stamp = (x: unknown): x is string =>
  text(x, 100) && Number.isFinite(Date.parse(x));
const strings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.length <= 40 && x.every((s) => text(s, 100));
export function validateDaily(input: unknown): DailyEntry {
  const x = input;
  if (
    !object(x) ||
    !validDate(x.date) ||
    x.id !== `daily-${x.date}` ||
    !stamp(x.createdAt) ||
    !stamp(x.updatedAt) ||
    (x.storageVersion !== undefined &&
      (!text(x.storageVersion, 150) || !x.storageVersion)) ||
    !(x.savedAt === null || stamp(x.savedAt)) ||
    !object(x.morning) ||
    !object(x.evening) ||
    !object(x.tarot) ||
    !object(x.awareness)
  )
    throw new Error("每日记录的日期、身份或结构无效。");
  for (const k of [
    "question",
    "interpretation",
    "focus",
    "prediction",
    "reference",
  ])
    if (!text(x.morning[k])) throw new Error("早晨记录文本格式无效。");
  const d = x.morning.drawn;
  if (
    d !== null &&
    (!object(d) ||
      !text(d.cardId, 100) ||
      !cardById[d.cardId] ||
      typeof d.reversed !== "boolean" ||
      !text(d.position, 200))
  )
    throw new Error("每日记录中的牌面格式无效。");
  for (const k of ["events", "memorable", "feelings"])
    if (!text(x.evening[k])) throw new Error("晚间记录文本格式无效。");
  if (!strings(x.evening.emotions) || !strings(x.evening.topics))
    throw new Error("情绪或生活主题格式无效。");
  if (
    !["high", "partial", "low", "none", "skip"].includes(
      String(x.tarot.congruence),
    )
  )
    throw new Error("契合程度无效。");
  for (const k of ["matches", "differences", "hindsight"])
    if (!text(x.tarot[k])) throw new Error("复盘记录文本格式无效。");
  for (const k of ["discovery", "question", "remember"])
    if (!text(x.awareness[k])) throw new Error("自我觉察文本格式无效。");
  if (
    !Array.isArray(x.photos) ||
    x.photos.length > 6 ||
    !x.photos.every(
      (p) =>
        object(p) &&
        text(p.id, 150) &&
        text(p.caption, 5000) &&
        text(p.dataUrl, 2000000) &&
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl),
    )
  )
    throw new Error("照片格式或数量无效，每篇最多6张压缩照片。");
  if (
    new Set(x.photos.map((p) => (p as DailyPhoto).id)).size !== x.photos.length
  )
    throw new Error("照片身份重复，请检查备份。");
  if (
    !Array.isArray(x.predictionVersions) ||
    x.predictionVersions.length > 20000 ||
    !x.predictionVersions.every(
      (v) => object(v) && stamp(v.at) && text(v.prediction),
    )
  )
    throw new Error("事前记录版本格式无效。");
  return structuredClone(x) as unknown as DailyEntry;
}
export function validateDailyEntries(input: unknown): DailyEntry[] {
  if (!Array.isArray(input) || input.length > 50000)
    throw new Error("每日记录列表无效。");
  const entries = input.map(validateDaily);
  if (new Set(entries.map((e) => e.id)).size !== entries.length)
    throw new Error("备份中存在重复日期记录。");
  return entries;
}
export function retainPredictionHistory(
  entry: DailyEntry,
  previous: DailyEntry | null,
  now = new Date().toISOString(),
): DailyEntry {
  const next = validateDaily(entry);
  // ponytail: 每天只有一个晨间主题，其他抽牌保留在原有练习日记；事前文本在每次实际改动时追加快照。
  const history = previous
    ? structuredClone(previous.predictionVersions)
    : structuredClone(next.predictionVersions);
  const old = previous?.morning.prediction;
  if (old && !history.length)
    history.push({ at: previous!.createdAt, prediction: old });
  if (
    (!previous || old !== next.morning.prediction) &&
    (next.morning.prediction || history.length)
  )
    history.push({ at: now, prediction: next.morning.prediction });
  next.predictionVersions = history;
  next.createdAt = previous?.createdAt || next.createdAt;
  next.savedAt = next.savedAt || previous?.savedAt || null;
  next.updatedAt = now;
  return next;
}

let opening: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new Error("此浏览器当前不支持日记存储，请允许网站使用本地存储。"),
    );
  return (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("tarot-studio-diary", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("entries", { keyPath: "id" });
    request.onerror = () => {
      opening = undefined;
      reject(new Error("无法打开日记数据库；原学习记录未改变。"));
    };
    request.onblocked = () => {
      opening = undefined;
      reject(
        new Error("另一个标签页阻止了日记数据库打开，请关闭旧标签页后重试。"),
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opening = undefined;
      };
      resolve(db);
    };
  }));
}
function transactionError(tx: IDBTransaction): Error {
  return new Error(
    tx.error?.name === "QuotaExceededError"
      ? "本地空间不足，日记尚未保存。请先导出备份，再检查浏览器存储空间。"
      : "日记存储操作失败，原有已保存记录仍保留。请重试或导出备份。",
  );
}
export async function getDaily(date: string): Promise<DailyEntry | null> {
  if (!validDate(date)) throw new Error("请选择有效日期。");
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const request = tx.objectStore("entries").get(`daily-${date}`);
    let result: DailyEntry | null = null;
    request.onsuccess = () => {
      try {
        result = request.result ? validateDaily(request.result) : null;
      } catch (e) {
        reject(e);
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export async function listDaily(includePhotos = true): Promise<DailyEntry[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const request = tx.objectStore("entries").openCursor();
    const result: DailyEntry[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const entry = validateDaily(cursor.value);
        if (!includePhotos) entry.photos = [];
        result.push(entry);
        cursor.continue();
      } catch (e) {
        reject(e);
      }
    };
    tx.oncomplete = () =>
      resolve(result.sort((a, b) => b.date.localeCompare(a.date)));
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export async function saveDaily(
  entry: DailyEntry,
  expectedVersion?: string | null,
): Promise<DailyEntry> {
  const checked = validateDaily(entry),
    db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite"),
      store = tx.objectStore("entries");
    let saved: DailyEntry;
    const request = store.get(checked.id);
    request.onsuccess = () => {
      try {
        const existing = request.result ? validateDaily(request.result) : null;
        checkDailyVersion(existing, expectedVersion);
        saved = newStoredVersion(retainPredictionHistory(checked, existing));
        store.put(saved);
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => resolve(saved!);
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export async function deleteDaily(
  id: string,
  expectedVersion?: string | null,
): Promise<void> {
  if (!/^daily-\d{4}-\d{2}-\d{2}$/.test(id) || !validDate(id.slice(6)))
    throw new Error("日记身份无效。");
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    if (expectedVersion === undefined) store.delete(id);
    else {
      const request = store.get(id);
      request.onsuccess = () => {
        try {
          checkDailyVersion(
            request.result ? validateDaily(request.result) : null,
            expectedVersion,
          );
          store.delete(id);
        } catch (e) {
          tx.abort();
          reject(e);
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export async function replaceDailyEntries(
  input: unknown,
  preserveVersions = false,
): Promise<void> {
  const checked = validateDailyEntries(input);
  const entries = preserveVersions ? checked : checked.map(newStoredVersion);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite"),
      store = tx.objectStore("entries");
    store.clear();
    entries.forEach((e) => store.put(e));
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export async function saveMorningReading({
  date = dateKey(),
  question,
  drawn,
  interpretation,
  reference,
}: {
  date?: string;
  question: string;
  drawn: DrawnCard;
  interpretation: string;
  reference: string;
}): Promise<{ id: string; created: boolean }> {
  const initial = newDaily(date);
  initial.morning = {
    ...initial.morning,
    drawn,
    question,
    interpretation,
    reference,
  };
  validateDaily(initial);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite"),
      store = tx.objectStore("entries");
    let created = false;
    const request = store.get(initial.id);
    request.onsuccess = () => {
      try {
        const existing = request.result ? validateDaily(request.result) : null;
        if (existing?.morning.drawn) return; // 已有关联时不修改晨间原文，即使碰巧抽到同一张牌也需要用户在日记里显式编辑。
        const next = existing || initial;
        next.morning = {
          ...next.morning,
          drawn,
          question,
          interpretation,
          reference,
        };
        store.put(newStoredVersion(retainPredictionHistory(next, existing)));
        created = true;
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => resolve({ id: initial.id, created });
    tx.onabort = tx.onerror = () => reject(transactionError(tx));
  });
}
export function studioBackup(state: LearningState, entries: DailyEntry[]) {
  return {
    app: "tarot-studio",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: state,
    studio: { entries },
  };
}
export function parseStudioBackup(input: unknown): {
  learning: LearningState;
  entries: DailyEntry[] | null;
} {
  if (!object(input)) throw new Error("这不是有效的备份对象。");
  const learning = migrateState(input);
  const entries =
    input.studio === undefined
      ? null
      : object(input.studio)
        ? validateDailyEntries(input.studio.entries)
        : (() => {
            throw new Error("书房备份的日记部分无效。");
          })();
  return { learning, entries };
}
export function downloadDiary(
  text: string,
  filename: string,
  mime = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type: mime })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function diaryText(e: DailyEntry): string {
  const c = e.morning.drawn,
    card = c
      ? `${cardById[c.cardId].name}（${c.reversed ? "逆位" : "正位"}）`
      : "未关联卡牌";
  return `${e.date}｜每日塔罗观察\n${card}\n\n早晨问题：${e.morning.question}\n初步解读：${e.morning.interpretation}\n今天关注：${e.morning.focus}\n事前想法：${e.morning.prediction}\n\n今天发生：${e.evening.events}\n值得记录：${e.evening.memorable}\n情绪感受：${e.evening.feelings}\n情绪标签：${e.evening.emotions.join("、")}\n生活主题：${e.evening.topics.join("、")}\n\n契合程度：${congruenceLabels[e.tarot.congruence]}\n符合之处：${e.tarot.matches}\n不符合之处：${e.tarot.differences}\n事后联想：${e.tarot.hindsight}\n\n新的认识：${e.awareness.discovery}\n继续讨论：${e.awareness.question}\n想记住：${e.awareness.remember}\n\n事前想法版本：\n${e.predictionVersions.map((v) => `${v.at}：${v.prediction || "（已清空当前文字，历史仍保留）"}`).join("\n")}\n\n参考快照：${e.morning.reference}`;
}
const csvCell = (x: string) =>
  `"${(/^[\s]*[=+\-@]/.test(x) ? "'" + x : x).replaceAll('"', '""')}"`;
export function diaryCsv(entries: DailyEntry[]): string {
  const rows = [
    [
      "日期",
      "卡牌",
      "方向",
      "初步解读",
      "今天关注",
      "事前想法",
      "发生的事",
      "值得记录",
      "情绪感受",
      "情绪",
      "生活主题",
      "契合程度",
      "符合",
      "不符合",
      "事后联想",
      "新的认识",
      "继续讨论",
      "想记住",
    ],
  ];
  for (const e of entries) {
    const c = e.morning.drawn;
    rows.push([
      e.date,
      c ? cardById[c.cardId].name : "",
      c ? (c.reversed ? "逆位" : "正位") : "",
      e.morning.interpretation,
      e.morning.focus,
      e.morning.prediction,
      e.evening.events,
      e.evening.memorable,
      e.evening.feelings,
      e.evening.emotions.join("、"),
      e.evening.topics.join("、"),
      congruenceLabels[e.tarot.congruence],
      e.tarot.matches,
      e.tarot.differences,
      e.tarot.hindsight,
      e.awareness.discovery,
      e.awareness.question,
      e.awareness.remember,
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export async function compressDiaryPhoto(file: File): Promise<DailyPhoto> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("请选择20MB以内的JPG、PNG或WebP照片。");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 100000000)
      throw new Error("照片尺寸过大或无法读取。");
    const scale = Math.min(
        1,
        1400 / Math.max(img.naturalWidth, img.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理这张照片。");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 2000000)
      throw new Error("照片压缩后仍过大，请选择尺寸较小的图片。");
    return { id: recordId(), dataUrl, caption: "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
