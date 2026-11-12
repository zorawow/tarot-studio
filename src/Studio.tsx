import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Headphones,
  Moon,
  NotebookPen,
  Play,
  Sun,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { environmentInfo, useStudio, type Environment } from "./StudioContext";
import { studioReflectionForDate } from "./data/studioReflections";
import { dateKey } from "./lib/learning";
import { pianoTracks, type PianoTrack } from "./studioAudio";
import "./studio.css";

export const studioAssets = {
  room: "studio/room-open-floor.webp",
  mobileRoom: "studio/room-mobile-open.webp",
  table: "studio/square-table.webp",
  views: "studio/views-illustrated.webp",
  objects: "studio/objects-illustrated.webp",
};
const objects = [
  {
    id: "cards",
    label: "抽牌",
    to: "/lab?daily=1",
    sprite: "0% 0%",
    x: 27,
    y: 34,
    w: 18,
    rotate: -9,
  },
  {
    id: "book",
    label: "塔罗学院",
    to: "/courses",
    sprite: "center",
    x: 39.5,
    y: 15,
    w: 22,
    rotate: 3,
  },
  {
    id: "pen",
    label: "记忆训练",
    to: "/training",
    sprite: "100% 100%",
    x: 74,
    y: 32.5,
    w: 19,
    rotate: 11,
  },
  {
    id: "journal",
    label: "每日日记",
    to: "/daily",
    sprite: "100% 0%",
    x: 52,
    y: 38,
    w: 25,
    rotate: -5,
  },
];
const viewPositions: Record<Environment, string> = {
  forest: "0% 0%",
  sea: "100% 0%",
  lake: "0% 100%",
  rain: "100% 100%",
};
function DailyReflection() {
  const [day, setDay] = useState(dateKey);
  useEffect(() => {
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(
      () => setDay(dateKey()),
      next.getTime() - Date.now() + 100,
    );
    return () => window.clearTimeout(timer);
  }, [day]);

  return (
    <aside className="studio-daily-reflection" aria-label="每日一句">
      <span>每日一句</span>
      <p>{studioReflectionForDate(day)}</p>
    </aside>
  );
}

function SoundControls() {
  const { audio, setAudio, toggleAudio, environment, error } = useStudio();
  return (
    <div className="studio-sound-content">
      <div className="studio-popover-heading">
        <Headphones size={18} />
        <div>
          <strong>书房声音</strong>
        </div>
      </div>
      <button className="studio-play" onClick={() => void toggleAudio()}>
        <span>
          {audio.playing ? <Volume2 size={18} /> : <Play size={18} />}
        </span>
        {audio.playing ? "暂停声音" : "开启声音"}
        <small>{audio.playing ? "正在播放" : "默认静音，轻触后播放"}</small>
      </button>
      <label>
        音量
        <input
          aria-label="书房音量"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audio.volume}
          onChange={(e) => setAudio({ volume: Number(e.target.value) })}
        />
      </label>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={audio.music}
          onChange={(e) => setAudio({ music: e.target.checked })}
        />
        钢琴音乐
      </label>
      <label className="studio-track-select">
        钢琴曲目
        <select
          value={audio.pianoTrack}
          onChange={(e) =>
            setAudio({ pianoTrack: e.target.value as PianoTrack })
          }
        >
          {pianoTracks.map(({ id, title, composer }) => (
            <option key={id} value={id}>
              {composer} · {title}
            </option>
          ))}
        </select>
      </label>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={audio.ambience}
          onChange={(e) => setAudio({ ambience: e.target.checked })}
        />
        自然环境音
      </label>
      <details className="studio-audio-details">
        <summary>环境音设置</summary>
        <label className="studio-check">
          <input
            type="checkbox"
            checked={audio.syncEnvironment}
            onChange={(e) => setAudio({ syncEnvironment: e.target.checked })}
          />
          声音跟随窗景
        </label>
        {!audio.syncEnvironment && (
          <label>
            环境声音
            <select
              aria-label="独立环境声音"
              value={audio.sound || environment}
              onChange={(e) =>
                setAudio({ sound: e.target.value as Environment })
              }
            >
              {Object.entries(environmentInfo).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </details>
      <a
        className="studio-sound-credit"
        href={`${import.meta.env.BASE_URL}studio/audio/credits.html`}
        target="_blank"
        rel="noreferrer"
      >
        声音来源
      </a>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function StudioSoundDock() {
  const [open, setOpen] = useState(false);
  const { audio } = useStudio();
  return (
    <div className="global-sound-dock">
      <button
        className="icon-button"
        aria-label="声音设置"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {audio.playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {open && (
        <div className="studio-popover global-sound-panel">
          <button
            className="studio-popover-close"
            aria-label="关闭声音设置"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
          <SoundControls />
        </div>
      )}
    </div>
  );
}
export function Studio({
  theme,
  toggleTheme,
  error: storageError,
}: {
  theme: string;
  toggleTheme: () => void;
  error: string;
}) {
  const {
    environment,
    setEnvironment,
    skipMotion,
    setSkipMotion,
    audio,
    error,
  } = useStudio();
  const [panel, setPanel] = useState<"environment" | "audio" | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [zoom, setZoom] = useState({ x: 50, y: 50 });
  const [loaded, setLoaded] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const timer = useRef<number | undefined>(undefined),
    world = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const enter = (to: string, button: HTMLButtonElement) => {
    if (target) return;
    setPanel(null);
    if (skipMotion || reduced) {
      navigate(to);
      return;
    }
    const scene = world.current?.getBoundingClientRect();
    if (scene?.width && scene.height) {
      const { left, top, width, height } = button.getBoundingClientRect();
      setZoom({
        x: ((left + width / 2 - scene.left) / scene.width) * 100,
        y: ((top + height / 2 - scene.top) / scene.height) * 100,
      });
    }
    setTarget(to);
    timer.current = window.setTimeout(() => navigate(to), 520);
  };
  const parallax = (e: PointerEvent<HTMLElement>) => {
    if (skipMotion || reduced || e.pointerType !== "mouse" || target) return;
    const r = e.currentTarget.getBoundingClientRect();
    world.current?.style.setProperty(
      "--px",
      `${(e.clientX - r.left) / r.width - 0.5}`,
    );
    world.current?.style.setProperty(
      "--py",
      `${(e.clientY - r.top) / r.height - 0.5}`,
    );
  };
  const toggle = (p: typeof panel) => setPanel(panel === p ? null : p);
  return (
    <div
      className={`studio-home env-${environment} ${target ? "is-entering" : ""} ${skipMotion || reduced ? "motion-reduced" : ""} ${loaded ? "is-ready" : ""}`}
      data-room-theme={theme}
      onPointerMove={parallax}
      onPointerLeave={() => {
        world.current?.style.setProperty("--px", "0");
        world.current?.style.setProperty("--py", "0");
      }}
    >
      <div
        className="studio-world"
        ref={world}
        style={{ transformOrigin: `${zoom.x}% ${zoom.y}%` } as CSSProperties}
      >
        <div className="studio-outside" aria-hidden="true">
          {Object.keys(viewPositions).map((key) => (
            <div
              key={key}
              className={`outside-view ${environment === key ? "visible" : ""}`}
              style={{ backgroundPosition: viewPositions[key as Environment] }}
            />
          ))}
          <div className="rain-streaks" />
          <div className="water-shimmer" />
        </div>
        <picture>
          <source
            media="(max-width: 800px)"
            srcSet={`${import.meta.env.BASE_URL}${studioAssets.mobileRoom}`}
          />
          <img
            className="studio-interior"
            src={`${import.meta.env.BASE_URL}${studioAssets.room}`}
            alt="窗边的温暖书房，左侧有书架、台灯和休息椅，面前是一张木桌"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </picture>
        <div className="studio-light" aria-hidden="true" />
        <div className="studio-table">
          <img
            className="studio-table-art"
            src={`${import.meta.env.BASE_URL}${studioAssets.table}`}
            alt=""
            draggable={false}
          />
          <span className="scene-decoration object-image" aria-hidden="true" />
          <nav className="desktop-objects" aria-label="书房主菜单">
            {objects.map((item) => (
              <button
                key={item.id}
                className={`scene-object object-${item.id}`}
                style={
                  {
                    "--x": `${item.x}%`,
                    "--y": `${item.y}%`,
                    "--w": `${item.w}%`,
                    "--angle": `${item.rotate}deg`,
                    "--sprite": item.sprite,
                  } as CSSProperties
                }
                onClick={(event) => enter(item.to, event.currentTarget)}
              >
                <span className="object-image" aria-hidden="true" />
                <span className="scene-object-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-logo" aria-hidden="true">
            t.
          </span>
          <div>
            <span lang="en">Tarot Studio</span>
            <h1>我的塔罗书房</h1>
          </div>
        </div>
        <div className="studio-tools" aria-label="书房设置" role="group">
          <button
            className={panel === "environment" ? "active" : ""}
            onClick={() => toggle("environment")}
            aria-label="切换自然环境"
            aria-expanded={panel === "environment"}
          >
            <span className="environment-dot" />
            <span>{environmentInfo[environment].name}</span>
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => toggle("audio")}
            aria-label="声音设置"
            aria-expanded={panel === "audio"}
          >
            {audio.playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={toggleTheme}
            aria-label={`切换为${theme === "dark" ? "浅色" : "深色"}模式`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <DailyReflection />
      {panel && (
        <>
          <button
            className="studio-popover-scrim"
            aria-label="关闭书房设置"
            onClick={() => setPanel(null)}
          />
          <aside
            className={`studio-popover studio-panel-${panel}`}
            aria-label={{ environment: "自然环境", audio: "声音设置" }[panel]}
          >
            <button
              className="studio-popover-close"
              aria-label="关闭设置"
              onClick={() => setPanel(null)}
            >
              <X size={17} />
            </button>
            {panel === "environment" ? (
              <>
                <div className="studio-popover-heading">
                  <span>切换窗景</span>
                </div>
                <div className="environment-options">
                  {Object.entries(environmentInfo).map(([key, value]) => (
                    <button
                      key={key}
                      className={environment === key ? "selected" : ""}
                      aria-pressed={environment === key}
                      onClick={() => setEnvironment(key as Environment)}
                    >
                      <span
                        className="environment-preview"
                        style={{
                          backgroundPosition: viewPositions[key as Environment],
                        }}
                      />
                      <span>
                        <strong>{value.name}</strong>
                        <small>{value.description}</small>
                      </span>
                      {environment === key && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <label className="studio-motion-option">
                  <input
                    type="checkbox"
                    checked={skipMotion}
                    onChange={(e) => setSkipMotion(e.target.checked)}
                  />
                  减少镜头动效
                </label>
              </>
            ) : (
              <SoundControls />
            )}
          </aside>
        </>
      )}
      {target && (
        <div className="room-transition" role="status">
          <span>
            正在走近你的
            {target.startsWith("/lab")
              ? "桌面"
              : target.startsWith("/daily")
                ? "日记"
                : target === "/courses"
                  ? "书籍"
                  : "安静时刻"}
            …
          </span>
          <button
            onClick={() => {
              window.clearTimeout(timer.current);
              navigate(target);
            }}
          >
            跳过转场
          </button>
        </div>
      )}
      {(error || storageError) && (
        <div className="studio-error" role="alert">
          {error || storageError}
        </div>
      )}
    </div>
  );
}

export function StudioSettings() {
  const { environment, setEnvironment, skipMotion, setSkipMotion } =
    useStudio();
  return (
    <div className="page-enter studio-settings-page">
      <div className="eyebrow">MAKE YOURSELF AT HOME</div>
      <h1>把书房，调成喜欢的样子</h1>
      <section className="panel">
        <h2>窗外的风景</h2>
        <div className="environment-options">
          {Object.entries(environmentInfo).map(([key, value]) => (
            <button
              key={key}
              className={environment === key ? "selected" : ""}
              onClick={() => setEnvironment(key as Environment)}
            >
              <span
                className="environment-preview"
                style={{
                  backgroundPosition: viewPositions[key as Environment],
                }}
              />
              <span>
                <strong>{value.name}</strong>
                <small>{value.description}</small>
              </span>
              {environment === key && <Check size={16} />}
            </button>
          ))}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={skipMotion}
            onChange={(e) => setSkipMotion(e.target.checked)}
          />
          跳过镜头转场与视差动画
        </label>
      </section>
      <section className="panel">
        <SoundControls />
      </section>
      <p className="muted">
        声音仅在你主动开启后播放。设置保存在当前浏览器，所有页面共用。
      </p>
      <Link className="button secondary" to="/daily?backup=1">
        每日观察与照片备份
        <NotebookPen size={16} />
      </Link>
    </div>
  );
}
