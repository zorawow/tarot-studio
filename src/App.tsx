import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Empty } from "./components";
import { useLearning } from "./lib/store";
import { Dashboard } from "./pages/Dashboard";
import { LibraryPage, CardDetail } from "./pages/Library";
import { Academy, Courses, LessonPage } from "./pages/Courses";
import { Training } from "./pages/Training";
import { Lab } from "./pages/Lab";
import { Journal } from "./pages/Journal";
import { Progress } from "./pages/Progress";
import { Questions } from "./pages/Questions";
import { FirstReading } from "./pages/FirstReading";
import { Studio, StudioSettings, StudioSoundDock } from "./Studio";
import { DailyJournal } from "./pages/DailyJournal";
import { ReflectionSpace, MentorGuide } from "./StudioPanels";
const pageNames: Record<string, string> = {
  dashboard: "学习概览",
  daily: "每日日记",
  courses: "塔罗学院",
  academy: "塔罗学院",
  cards: "塔罗牌库",
  questions: "提问练习",
  training: "记忆训练",
  practice: "记忆训练",
  lab: "抽牌与解牌",
  reading: "抽牌与解牌",
  journal: "解牌与学习档案",
  progress: "学习进度",
  reflection: "自我觉察",
  mentor: "象征与提问",
  settings: "书房设置",
  "first-reading": "第一次教学解读",
};

export function App() {
  const { error } = useLearning();
  const { pathname } = useLocation();
  const [section, subsection] = pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  const isCoursePage = section === "courses" && Boolean(subsection);
  const name = isCoursePage ? "微课程" : pageNames[section] || "我的书房";
  const returnToAcademy =
    isCoursePage || section === "cards" || section === "questions";
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "dark",
  );
  const [themeError, setThemeError] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = name + " · Tarot Studio";
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname, name]);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#1b201e" : "#f6f2eb");
    try {
      localStorage.setItem("tarot-theme", next);
      setThemeError("");
    } catch {
      setThemeError("主题已切换，浏览器当前不允许保存偏好。");
    }
  };
  if (pathname === "/")
    return (
      <main id="main-content" className="studio-root" tabIndex={-1}>
        <Studio
          theme={theme}
          toggleTheme={toggleTheme}
          error={error || themeError}
        />
      </main>
    );
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
          document.getElementById("main-content")?.scrollIntoView();
        }}
      >
        跳到主要内容
      </a>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            {section !== "daily" && (
              <Link
                className="room-return"
                to={returnToAcademy ? "/courses" : "/"}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {returnToAcademy ? "返回塔罗学院" : "返回书房"}
              </Link>
            )}
            <span className="topbar-page">{name}</span>
          </div>
          <div className="topbar-right">
            <StudioSoundDock />
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={
                "切换为" + (theme === "dark" ? "浅色" : "深色") + "模式"
              }
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        {(error || themeError) && (
          <div className="storage-warning" role="alert">
            {error || themeError} <Link to="/progress">备份与恢复 →</Link>
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily" element={<DailyJournal />} />
            <Route path="/daily/history" element={<DailyJournal />} />
            <Route path="/reflection" element={<ReflectionSpace />} />
            <Route path="/mentor" element={<MentorGuide />} />
            <Route path="/settings" element={<StudioSettings />} />
            <Route path="/reading" element={<Lab />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/practice" element={<Training />} />
            <Route path="/cards" element={<LibraryPage />} />
            <Route path="/cards/:id" element={<CardDetail />} />
            <Route path="/courses" element={<Academy />} />
            <Route path="/courses/lessons" element={<Courses />} />
            <Route path="/courses/:id" element={<LessonPage />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/first-reading" element={<FirstReading />} />
            <Route path="/training" element={<Training />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/progress" element={<Progress />} />
            <Route
              path="*"
              element={
                <Empty
                  title="这条小径还没有通往页面"
                  description="可以回到首页，继续今天的学习。"
                >
                  <Link className="button primary" to="/">
                    返回书房
                  </Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        <footer className="site-footer">
          <span>TAROT STUDIO</span>
          <Link to="/progress#sources">内容与素材来源</Link>
        </footer>
      </div>
    </div>
  );
}
