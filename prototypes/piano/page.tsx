"use client";

import { Dices, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "playground.piano.v1";

const PRESETS = [
  { id: "pad", label: "Pad" },
  { id: "box", label: "Music box" },
  { id: "rhodes", label: "Rhodes" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

type Settings = {
  preset: PresetId;
  space: number;
  volume: number;
  hue: number;
};

const DEFAULTS: Settings = { preset: "pad", space: 0.35, volume: 0.75, hue: 268 };

/* ------------------------------ audio ------------------------------ */

function makeImpulse(ctx: AudioContext, seconds = 2.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
    }
  }
  return buffer;
}

type Voice = { stop: () => void };

class Engine {
  private ctx: AudioContext;
  private master: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private settings: Settings;

  constructor(settings: Settings) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.connect(master);

    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = settings.space;
    wet.connect(convolver);
    convolver.connect(compressor);

    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(compressor);

    this.ctx = ctx;
    this.master = master;
    this.dry = dry;
    this.wet = wet;
    this.settings = settings;
  }

  update(next: Settings) {
    this.settings = next;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(next.volume, now, 0.02);
    this.wet.gain.setTargetAtTime(next.space, now, 0.04);
  }

  resume() {
    if (this.ctx.state !== "running") void this.ctx.resume();
  }

  play(midi: number): Voice {
    const { ctx, settings } = this;
    const now = ctx.currentTime;
    const freq = 440 * 2 ** ((midi - 69) / 12);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.dry);
    out.connect(this.wet);

    const oscs: OscillatorNode[] = [];
    const add = (
      type: OscillatorType,
      ratio: number,
      gain: number,
      detune = 0,
    ) => {
      const osc = ctx.createOscillator();
      const level = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      osc.detune.value = detune;
      level.gain.value = gain;
      osc.connect(level);
      level.connect(out);
      osc.start(now);
      oscs.push(osc);
    };

    let release = 0.25;

    if (settings.preset === "pad") {
      add("triangle", 1, 0.3, -7);
      add("triangle", 1, 0.3, 7);
      add("sine", 0.5, 0.16);
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.32, now + 0.16);
      out.gain.setTargetAtTime(0.17, now + 0.16, 0.55);
      release = 0.9;
    }

    if (settings.preset === "box") {
      add("sine", 1, 0.5);
      add("sine", 2, 0.18);
      add("sine", 3.01, 0.06);
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.42, now + 0.005);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      release = 0.1;
    }

    if (settings.preset === "rhodes") {
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.value = freq;

      const modulator = ctx.createOscillator();
      modulator.type = "sine";
      modulator.frequency.value = freq * 2;
      const index = ctx.createGain();
      index.gain.setValueAtTime(freq * 2.2, now);
      index.gain.exponentialRampToValueAtTime(freq * 0.02, now + 0.5);
      modulator.connect(index);
      index.connect(carrier.frequency);

      const level = ctx.createGain();
      level.gain.value = 0.45;
      carrier.connect(level);
      level.connect(out);
      carrier.start(now);
      modulator.start(now);
      oscs.push(carrier, modulator);

      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.45, now + 0.008);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      release = 0.18;
    }

    return {
      stop: () => {
        const at = ctx.currentTime;
        out.gain.cancelScheduledValues(at);
        out.gain.setTargetAtTime(0.0001, at, release / 3);
        oscs.forEach((osc) => {
          osc.stop(at + release + 0.1);
          osc.onended = () => {
            osc.disconnect();
            out.disconnect();
          };
        });
      },
    };
  }
}

/* ---------------------------- keyboard ---------------------------- */

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
/** Black keys are keyed by the white key they sit after, not by semitone. */
const BLACK_AFTER: Record<number, number> = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Physical keyboard, one octave from middle C: a w s e d f t g y h u j k. */
const KEY_TO_SEMITONE: Record<string, number> = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
};
const WHITE_LABELS = ["a", "s", "d", "f", "g", "h", "j"];
const BLACK_LABELS = ["w", "e", "t", "y", "u"];

function noteLabel(midi: number) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/* --------------------------- components --------------------------- */

export default function Piano() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [pressed, setPressed] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState(true);

  const engineRef = useRef<Engine | null>(null);
  const voices = useRef(new Map<string, { midi: number; voice: Voice }>());
  const settingsRef = useRef(settings);

  /* eslint-disable react-hooks/set-state-in-effect --
     Persisted settings can only be read after hydration: reading them during
     render makes the server HTML and the client's first render disagree. This
     is the external-system sync the effect exists for. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      const labels = localStorage.getItem(`${STORAGE_KEY}.labels`);
      if (labels === "0") setShowLabels(false);
    } catch {
      /* private mode: run with defaults */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    settingsRef.current = settings;
    engineRef.current?.update(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const press = useCallback((source: string, midi: number) => {
    const engine =
      engineRef.current ??
      (engineRef.current = new Engine(settingsRef.current));
    engine.resume();

    voices.current.get(source)?.voice.stop();
    voices.current.set(source, { midi, voice: engine.play(midi) });
    setPressed((current) =>
      current.includes(midi) ? current : [...current, midi],
    );
  }, []);

  const release = useCallback((source: string) => {
    const held = voices.current.get(source);
    if (!held) return;
    held.voice.stop();
    voices.current.delete(source);
    setPressed((current) => current.filter((midi) => midi !== held.midi));
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const key = event.key.toLowerCase();
      const semitone = KEY_TO_SEMITONE[key];
      if (semitone === undefined) return;
      event.preventDefault();
      press(`key:${key}`, 60 + semitone);
    };
    const up = (event: KeyboardEvent) => release(`key:${event.key.toLowerCase()}`);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press, release]);

  const randomize = useCallback(() => {
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)].id;
    setSettings((current) => ({
      ...current,
      preset,
      space: 0.12 + Math.random() * 0.6,
      hue: Math.floor(Math.random() * 360),
    }));
  }, []);

  const octaves = useMemo(() => [0, 1], []);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden overscroll-none bg-canvas pt-14"
      style={{ "--hue": settings.hue } as CSSProperties}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-4 px-4 pb-2 sm:px-5">
        <h1 className="text-[13px] font-medium tracking-wide text-muted-fg uppercase">
          Piano
        </h1>
        <p className="hidden text-xs text-muted-fg sm:block">
          Keys A–K also play. Hold for sustain.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex h-[52dvh] shrink-0 gap-2 p-3 sm:gap-3 sm:p-4 lg:h-auto lg:flex-1">
          {octaves.map((octave) => (
            <div
              key={octave}
              className={cn(
                "min-h-0 flex-1",
                octave === 1 && "hidden sm:block",
              )}
            >
              <Octave
                start={60 + octave * 12}
                pressed={pressed}
                labels={showLabels && octave === 0}
                onPress={press}
                onRelease={release}
              />
            </div>
          ))}
        </div>

        <aside className="relative min-h-0 flex-1 overflow-y-auto border-t border-border bg-surface lg:w-[320px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-fg">
                Sound
              </legend>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((preset) => {
                  const active = settings.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSettings((current) => ({ ...current, preset: preset.id }))
                      }
                      className={cn(
                        "h-11 truncate rounded-lg border px-2 text-[12px] font-medium transition-colors duration-150",
                        active
                          ? "border-accent/40 bg-accent/12 text-fg"
                          : "border-border bg-surface-2 text-muted-fg hover:border-border-strong hover:text-fg",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Slider
              label="Space"
              value={settings.space}
              onChange={(space) => setSettings((current) => ({ ...current, space }))}
            />
            <Slider
              label="Volume"
              value={settings.volume}
              onChange={(volume) => setSettings((current) => ({ ...current, volume }))}
            />

            <label className="flex h-11 items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 text-[13px]">
              Key labels
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(event) => {
                  setShowLabels(event.target.checked);
                  try {
                    localStorage.setItem(
                      `${STORAGE_KEY}.labels`,
                      event.target.checked ? "1" : "0",
                    );
                  } catch {
                    /* ignore */
                  }
                }}
                className="size-4 accent-[var(--accent)]"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={randomize}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-2 text-[13px] font-medium transition-colors duration-150 hover:bg-surface active:scale-[0.99]"
              >
                <Dices className="size-4" strokeWidth={1.9} />
                Randomize
              </button>
              <button
                type="button"
                aria-label="Reset settings"
                onClick={() => setSettings(DEFAULTS)}
                className="flex size-11 items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
              >
                <RotateCcw className="size-4" strokeWidth={1.9} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = `slider-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-muted-fg">
          {Math.round(value * 100)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer"
      />
    </div>
  );
}

function Octave({
  start,
  pressed,
  labels,
  onPress,
  onRelease,
}: {
  start: number;
  pressed: number[];
  labels: boolean;
  onPress: (source: string, midi: number) => void;
  onRelease: (source: string) => void;
}) {
  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onPress(`p:${event.pointerId}`, midi);
  };

  const handleUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    onRelease(`p:${event.pointerId}`);
  };

  return (
    <div className="relative flex h-full touch-none select-none">
      {WHITE_SEMITONES.map((semi, index) => {
        const midi = start + semi;
        const down = pressed.includes(midi);
        const label = labels && index < WHITE_LABELS.length ? WHITE_LABELS[index] : null;

        return (
          <button
            key={midi}
            type="button"
            aria-label={noteLabel(midi)}
            data-down={down}
            onPointerDown={(event) => handleDown(event, midi)}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onContextMenu={(event) => event.preventDefault()}
            className="key-white relative flex-1 translate-y-0 rounded-b-[9px] border border-b-0 border-border-strong pt-0 transition-transform duration-75 active:translate-y-px"
          >
            {label ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-2.5 font-mono text-[10px] text-muted-fg">
                {label}
              </span>
            ) : null}
          </button>
        );
      })}

      {Object.entries(BLACK_AFTER).map(([whiteIndex, semi], blackIndex) => {
        const index = Number(whiteIndex);
        const midi = start + semi;
        const down = pressed.includes(midi);
        const label = labels && blackIndex < BLACK_LABELS.length ? BLACK_LABELS[blackIndex] : null;

        return (
          <button
            key={midi}
            type="button"
            aria-label={noteLabel(midi)}
            data-down={down}
            onPointerDown={(event) => handleDown(event, midi)}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              left: `calc(${((index + 1) / 7) * 100}% - ${62 / 7 / 2}%)`,
              width: `${62 / 7}%`,
            }}
            className="key-black absolute top-0 flex h-[62%] items-end justify-center rounded-b-[6px] pb-2 transition-transform duration-75 active:translate-y-px"
          >
            {label ? (
              <span className="pointer-events-none font-mono text-[10px] uppercase text-white/45">
                {label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
