import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createStudioAudio,
  isEnvironment,
  normalizeStudioPreferences,
  STUDIO_PREFERENCES_KEY,
  type AudioPreferences,
  type Environment,
  type StudioAudio,
} from "./studioAudio";
export { environmentInfo, pianoTracks } from "./studioAudio";
export type { Environment, PianoTrack } from "./studioAudio";
type StudioContextValue = {
  environment: Environment;
  setEnvironment: (environment: Environment) => void;
  skipMotion: boolean;
  setSkipMotion: (skip: boolean) => void;
  audio: AudioPreferences & { playing: boolean };
  setAudio: (patch: Partial<AudioPreferences>) => void;
  toggleAudio: () => Promise<void>;
  error: string;
};
const StudioContext = createContext<StudioContextValue | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STUDIO_PREFERENCES_KEY);
      return {
        preferences: normalizeStudioPreferences(raw ? JSON.parse(raw) : null),
        error: "",
      };
    } catch {
      return {
        preferences: normalizeStudioPreferences(null),
        error:
          "书房偏好无法读取，已使用默认设置；原偏好暂未覆盖。学习记录不受影响。",
      };
    }
  });
  const [preferences, setPreferences] = useState(initial.preferences);
  const [storageError, setStorageError] = useState(initial.error);
  const [audioError, setAudioError] = useState("");
  const [touched, setTouched] = useState(false);
  const [playing, setPlaying] = useState(false);
  const engine = useRef<StudioAudio | null>(null);
  const preferencesRef = useRef(preferences);
  const playingRef = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  preferencesRef.current = preferences;
  useEffect(() => {
    if (initial.error && !touched) return;
    try {
      // Transport state is deliberately not stored: a new document always starts silently.
      localStorage.setItem(STUDIO_PREFERENCES_KEY, JSON.stringify(preferences));
      setStorageError("");
    } catch {
      setStorageError(
        "书房偏好当前无法保存，仍可继续使用；请检查浏览器存储设置。学习记录独立保存。",
      );
    }
  }, [preferences, touched, initial.error]);
  useEffect(() => {
    engine.current?.configure(preferences.audio);
    if (!preferences.audio.music && !preferences.audio.ambience)
      void engine.current
        ?.pause()
        .catch(() => setAudioError("声音未能暂停，请刷新页面关闭声音。"));
  }, [preferences.audio]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  const setEnvironment = useCallback((environment: Environment) => {
    if (!isEnvironment(environment)) return;
    setTouched(true);
    setPreferences((previous) =>
      normalizeStudioPreferences({ ...previous, environment }),
    );
  }, []);
  const setSkipMotion = useCallback((skipMotion: boolean) => {
    setTouched(true);
    setPreferences((previous) => ({ ...previous, skipMotion: !!skipMotion }));
  }, []);
  const setAudio = useCallback((patch: Partial<AudioPreferences>) => {
    setTouched(true);
    setPreferences((previous) =>
      normalizeStudioPreferences({
        ...previous,
        audio: { ...previous.audio, ...patch },
      }),
    );
    setAudioError("");
  }, []);
  const toggleAudio = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setAudioError("");
    try {
      if (playingRef.current) {
        await engine.current?.pause();
      } else {
        const audio = preferencesRef.current.audio;
        if (!audio.music && !audio.ambience)
          throw new Error("请先选择钢琴或环境音，再开启声音。");
        engine.current ??= createStudioAudio(
          (value) => {
            if (mounted.current) {
              playingRef.current = value;
              setPlaying(value);
            }
          },
          (message) => {
            if (mounted.current) setAudioError(message);
          },
        );
        engine.current.configure(audio);
        await engine.current.start();
      }
    } catch (error) {
      if (mounted.current) {
        playingRef.current = false;
        setPlaying(false);
        setAudioError(
          error instanceof Error
            ? error.message
            : "声音暂时无法播放，请再次点击重试。",
        );
      }
    } finally {
      busy.current = false;
    }
  }, []);
  return (
    <StudioContext.Provider
      value={{
        environment: preferences.environment,
        setEnvironment,
        skipMotion: preferences.skipMotion,
        setSkipMotion,
        audio: { ...preferences.audio, playing },
        setAudio,
        toggleAudio,
        error: storageError || audioError,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}
export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error("StudioProvider is required");
  return context;
}
