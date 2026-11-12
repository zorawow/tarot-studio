export type Environment = "forest" | "sea" | "lake" | "rain";
export const environmentInfo: Record<
  Environment,
  { name: string; description: string }
> = {
  forest: {
    name: "森林书房",
    description: "花园、绿树与远山，留一点清新的日光。",
  },
  sea: { name: "海边书房", description: "开阔海面与地平线，让呼吸慢下来。" },
  lake: {
    name: "山湖书房",
    description: "安静湖水与层层山峦，给思绪一些空间。",
  },
  rain: { name: "雨天书房", description: "窗外细雨，窗内暖灯，适合慢慢复盘。" },
};
export const STUDIO_PREFERENCES_KEY = "tarot-studio:preferences:v1";
export const pianoTracks = [
  { id: "gymnopedie", title: "第一号吉姆诺佩蒂", composer: "萨蒂" },
  { id: "bach-prelude", title: "C 大调前奏曲", composer: "巴赫" },
  { id: "chopin-nocturne", title: "降 E 大调夜曲", composer: "肖邦" },
] as const;
export type PianoTrack = (typeof pianoTracks)[number]["id"];
export interface AudioPreferences {
  volume: number;
  music: boolean;
  pianoTrack: PianoTrack;
  ambience: boolean;
  syncEnvironment: boolean;
  sound: Environment;
}
export interface StudioPreferences {
  environment: Environment;
  skipMotion: boolean;
  audio: AudioPreferences;
}
export const isEnvironment = (value: unknown): value is Environment =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(environmentInfo, value);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function normalizeStudioPreferences(input: unknown): StudioPreferences {
  const value = object(input) ? input : {};
  const audio = object(value.audio) ? value.audio : {};
  const environment = isEnvironment(value.environment)
    ? value.environment
    : "forest";
  const syncEnvironment =
    typeof audio.syncEnvironment === "boolean" ? audio.syncEnvironment : true;
  return {
    environment,
    skipMotion:
      typeof value.skipMotion === "boolean" ? value.skipMotion : false,
    audio: {
      volume:
        typeof audio.volume === "number" && Number.isFinite(audio.volume)
          ? Math.min(1, Math.max(0, audio.volume))
          : 0.3,
      music: typeof audio.music === "boolean" ? audio.music : true,
      pianoTrack:
        pianoTracks.find(({ id }) => id === audio.pianoTrack)?.id ??
        pianoTracks[0].id,
      ambience: typeof audio.ambience === "boolean" ? audio.ambience : true,
      syncEnvironment,
      sound: syncEnvironment
        ? environment
        : isEnvironment(audio.sound)
          ? audio.sound
          : environment,
    },
  };
}

export interface StudioAudio {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  configure: (preferences: AudioPreferences) => void;
  dispose: () => void;
}

// The recordings and their licenses are listed in public/studio/audio/credits.html.
type Recording = PianoTrack | Environment;

const recordingLevels: Record<Recording, number> = {
  gymnopedie: 0.82,
  "bach-prelude": 0.82,
  "chopin-nocturne": 0.82,
  forest: 0.5,
  sea: 0.48,
  lake: 0.54,
  rain: 0.45,
};

type Playback = {
  recording: Recording;
  source: AudioBufferSourceNode;
  gain: GainNode;
};
type Loading = {
  recording: Recording;
  controller: AbortController;
  ready: Promise<void>;
};
type Layer = { playback?: Playback; loading?: Loading };

export function createStudioAudio(
  onPlayingChange: (playing: boolean) => void,
  onError: (message: string) => void = () => {},
): StudioAudio {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass)
    throw new Error("这个浏览器暂不支持环境声音，其他书房功能仍可使用。");

  let context: AudioContext;
  try {
    // Keep the decoded stereo piano near its encoded sample rate on mobile.
    context = new AudioContextClass({ sampleRate: 32000 });
  } catch {
    context = new AudioContextClass();
  }
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const library = new URL("studio/audio/", document.baseURI);
  const music: Layer = {};
  const ambience: Layer = {};
  let preferences = normalizeStudioPreferences(null).audio;
  let disposed = false;
  let revision = 0;

  const smooth = (parameter: AudioParam, value: number, seconds: number) => {
    const now = context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(value, now, seconds);
  };
  const cancel = (layer: Layer) => {
    layer.loading?.controller.abort();
    layer.loading = undefined;
  };
  const fadeOut = (layer: Layer) => {
    if (!layer.playback) return;
    const { source, gain } = layer.playback;
    smooth(gain.gain, 0, 0.18);
    source.stop(context.currentTime + 1.1);
    layer.playback = undefined;
  };

  const applyTrack = (layer: Layer, recording?: Recording): Promise<void> => {
    if (layer.loading?.recording !== recording) cancel(layer);
    if (!recording) {
      fadeOut(layer);
      return Promise.resolve();
    }
    if (layer.playback?.recording === recording) return Promise.resolve();
    if (layer.loading) return layer.loading.ready;

    const controller = new AbortController();
    const { signal } = controller;
    const ready = (async () => {
      try {
        const filename = recording === "gymnopedie" ? "piano" : recording;
        const response = await fetch(new URL(`${filename}.mp3`, library), {
          signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const encoded = await response.arrayBuffer();
        if (signal.aborted) return;
        const buffer = await context.decodeAudioData(encoded);
        if (signal.aborted || disposed || context.state !== "running") return;

        const source = context.createBufferSource();
        const gain = context.createGain();
        gain.gain.value = 0;
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        gain.connect(master);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        fadeOut(layer);
        source.start();
        smooth(gain.gain, recordingLevels[recording], 0.28);
        layer.playback = { recording, source, gain };
      } catch {
        if (!signal.aborted && !disposed) {
          fadeOut(layer);
          const name =
            isEnvironment(recording)
              ? environmentInfo[recording].name + "的环境音"
              : "钢琴曲";
          onError(`${name}暂时无法载入。请检查网络后重新开启声音。`);
        }
      } finally {
        if (layer.loading?.controller === controller) layer.loading = undefined;
      }
    })();
    layer.loading = { recording, controller, ready };
    return ready;
  };

  const refresh = () => {
    if (disposed || context.state !== "running") return;
    const current = ++revision;
    smooth(master.gain, preferences.volume, 0.12);
    void Promise.all([
      applyTrack(music, preferences.music ? preferences.pianoTrack : undefined),
      applyTrack(
        ambience,
        preferences.ambience ? preferences.sound : undefined,
      ),
    ]).then(() => {
      if (
        !disposed &&
        revision === current &&
        context.state === "running" &&
        !music.playback &&
        !ambience.playback
      ) {
        void context.suspend().catch(() => onPlayingChange(false));
      }
    });
  };

  context.onstatechange = () => {
    if (disposed) return;
    const playing = context.state === "running";
    if (playing) refresh();
    onPlayingChange(playing);
  };

  return {
    configure: (next) => {
      preferences = next;
      refresh();
    },
    start: async () => {
      if (disposed) throw new Error("声音已关闭，请重新打开书房后再试。");
      await context.resume();
      if (context.state !== "running")
        throw new Error("浏览器尚未允许播放，请再次点击声音按钮。");
      refresh();
      onPlayingChange(true);
    },
    pause: async () => {
      ++revision;
      cancel(music);
      cancel(ambience);
      if (!disposed && context.state !== "closed") await context.suspend();
      if (!disposed) onPlayingChange(false);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancel(music);
      cancel(ambience);
      music.playback = undefined;
      ambience.playback = undefined;
      context.onstatechange = null;
      master.disconnect();
      if (context.state !== "closed") void context.close().catch(() => {});
    },
  };
}
