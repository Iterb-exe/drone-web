import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import uPlot from "uplot";
import {
  ArrowLeft,
  Activity,
  Battery,
  Calendar,
  Clock,
  Compass,
  FileText,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { MOCK_FLIGHTS } from "../data/mockFlights";
import DroneAttitude3D from "../components/DroneAttitude3D";
import type { TelemetryPacket } from "../../../shared/types";
import type { SeriesConfig } from "../components/RealtimeChart";

interface RecordedFlightChartProps {
  title: string;
  samples: TelemetryPacket[];
  series: SeriesConfig[];
  yRange: [number, number];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}

function RecordedFlightChart({
  title,
  samples,
  series,
  yRange,
  activeIndex,
  onSelectIndex,
}: RecordedFlightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const onSelectRef = useRef(onSelectIndex);
  const seriesRef = useRef(series);
  const yRangeRef = useRef(yRange);

  onSelectRef.current = onSelectIndex;
  seriesRef.current = series;
  yRangeRef.current = yRange;

  // Inicjalizacja wykresu TYLKO przy zmianie zestawu próbek (lotu),
  // dzięki czemu wykres nigdy nie jest niszczony w trakcie odtwarzania!
  useEffect(() => {
    if (!containerRef.current || samples.length === 0) return;

    const currentSeries = seriesRef.current;
    const currentYRange = yRangeRef.current;

    const timestamps = samples.map((p: TelemetryPacket) => p.timestampMs / 1000);
    const values = currentSeries.map((s: SeriesConfig) =>
      samples.map((p: TelemetryPacket) => s.extract(p))
    );
    const data: uPlot.AlignedData = [timestamps, ...values];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: window.innerWidth < 640 ? 220 : 260,
      cursor: {
        focus: { prox: -1 },
      },
      scales: {
        x: { time: false },
        y: { range: currentYRange },
      },
      axes: [
        {
          stroke: "#71717a",
          grid: { stroke: "#27272a", width: 1 },
          values: (_u, vals) => vals.map((v) => `${v.toFixed(0)}s`),
        },
        {
          stroke: "#71717a",
          grid: { stroke: "#27272a", width: 1 },
          values: (_u, vals) =>
            vals.map((v) => `${v.toFixed(1)} ${currentSeries[0]?.unit ?? ""}`),
        },
      ],
      series: [
        {
          label: "Czas lotu",
          value: (_u, v) => (v != null ? `${v.toFixed(0)} s` : "--"),
        },
        ...currentSeries.map((s: SeriesConfig, idx: number) => ({
          label: `${s.label} (${s.unit})`,
          stroke: s.color,
          width: 2,
          fill: `${s.color}15`,
          value: (u: uPlot, rawValue: number | null) => {
            if (rawValue != null) return `${rawValue.toFixed(2)} ${s.unit}`;
            const arr = u.data[idx + 1];
            const last = arr && arr.length > 0 ? arr[arr.length - 1] : null;
            return last != null ? `${Number(last).toFixed(2)} ${s.unit}` : "--";
          },
        })),
      ],
    };

    const u = new uPlot(opts, data, containerRef.current);
    plotRef.current = u;

    const handleMouseDown = () => {
      if (u.cursor.idx != null) {
        onSelectRef.current(u.cursor.idx);
      }
    };
    u.over.addEventListener("mousedown", handleMouseDown);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        u.setSize({
          width: entry.contentRect.width,
          height: window.innerWidth < 640 ? 220 : 260,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      u.over.removeEventListener("mousedown", handleMouseDown);
      resizeObserver.disconnect();
      u.destroy();
      plotRef.current = null;
    };
  }, [samples]);

  // Lekka aktualizacja samego kursora (bez przebudowy DOM i bez skakania scrolla)
  useEffect(() => {
    const u = plotRef.current;
    if (!u || !samples[activeIndex] || u.bbox.width <= 0) return;

    const timeSec = samples[activeIndex].timestampMs / 1000;
    const leftPx = u.valToPos(timeSec, "x");
    u.setCursor({ left: leftPx, top: 20 }, false);
  }, [activeIndex, samples]);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-semibold text-zinc-200">
          {title}
        </h3>
        <span className="text-[11px] text-zinc-500">
          Kliknij wykres, aby przejść do wybranej sekundy
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full min-h-[220px] sm:min-h-[260px]"
      />
    </div>
  );
}

export default function FlightOverview() {
  const { flightId } = useParams<{ flightId: string }>();

  const flight = useMemo(
    () => MOCK_FLIGHTS.find((f) => f.id === flightId),
    [flightId]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  useEffect(() => {
    setSelectedIndex(0);
    setIsPlaying(false);
  }, [flightId]);

  useEffect(() => {
    if (!isPlaying || !flight) return;

    const intervalMs = Math.max(30, Math.round(250 / playbackSpeed));
    const timer = setInterval(() => {
      setSelectedIndex((prev: number) => {
        if (prev >= flight.samples.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, flight]);

  const stats = useMemo(() => {
    if (!flight || flight.samples.length === 0) return null;
    const s: TelemetryPacket[] = flight.samples;
    const count = s.length;

    const altitudes = s.map((p: TelemetryPacket) => p.altitude);
    const voltages = s.map((p: TelemetryPacket) => p.batteryVoltage);
    const absRolls = s.map((p: TelemetryPacket) => Math.abs(p.roll));
    const absPitches = s.map((p: TelemetryPacket) => Math.abs(p.pitch));

    const avgAltitude =
      altitudes.reduce((a: number, b: number) => a + b, 0) / count;
    const maxAltitude = Math.max(...altitudes);

    const startVoltage = voltages[0];
    const endVoltage = voltages[voltages.length - 1];
    const minVoltage = Math.min(...voltages);
    const avgVoltage =
      voltages.reduce((a: number, b: number) => a + b, 0) / count;

    const maxRoll = Math.max(...absRolls);
    const maxPitch = Math.max(...absPitches);
    const avgRoll =
      absRolls.reduce((a: number, b: number) => a + b, 0) / count;
    const avgPitch =
      absPitches.reduce((a: number, b: number) => a + b, 0) / count;

    return {
      avgAltitude,
      maxAltitude,
      startVoltage,
      endVoltage,
      minVoltage,
      avgVoltage,
      maxRoll,
      maxPitch,
      avgRoll,
      avgPitch,
      totalSamples: count,
    };
  }, [flight]);

  if (!flight || !stats) {
    return <Navigate to="/" replace />;
  }

  const currentSample: TelemetryPacket =
    flight.samples[selectedIndex] ?? flight.samples[0];
  const currentSec = Math.round(currentSample.timestampMs / 1000);

  const formatMmSs = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Nagłówek powrotu i metadane lotu */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-zinc-800">
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do panelu głównego
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl sm:text-3xl font-bold font-mono text-sky-400">
              {flight.id}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                flight.hadFailsafe
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {flight.hadFailsafe
                ? "Wykryto Failsafe w trakcie lotu"
                : "Lot zakończony pomyślnie"}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
            {flight.notes}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 text-xs sm:text-sm">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 block text-xs">Data lotu</span>
            <span className="font-semibold text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {flight.date}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 block text-xs">Przedział czasu</span>
            <span className="font-semibold text-zinc-100 tabular-nums block mt-0.5">
              {flight.startTime} – {flight.endTime}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400 block text-xs">Czas trwania</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {flight.durationFormatted} ({flight.durationSec} s)
            </span>
          </div>
        </div>
      </div>

      {/* Sekcja 1: Rekonstrukcja 3D lotu + Oś czasu */}
      <section className="space-y-4">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Odtwarzacz przebiegu lotu 3D i oś czasu (Timeline)
        </h3>

        <DroneAttitude3D
          overridePacket={currentSample}
          maxAltitudeScale={Math.max(15, Math.ceil(stats.maxAltitude))}
        />

        <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedIndex >= flight.samples.length - 1) {
                    setSelectedIndex(0);
                  }
                  setIsPlaying((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pauza
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Odtwórz lot
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setSelectedIndex(0);
                }}
                title="Przewiń na początek"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 ml-1">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? "bg-zinc-800 text-sky-400"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs sm:text-sm font-mono tabular-nums text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              Czas misji:{" "}
              <strong className="text-sky-400">{formatMmSs(currentSec)}</strong>{" "}
              / {formatMmSs(flight.durationSec)}{" "}
              <span className="text-zinc-500">({currentSec}s)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={flight.samples.length - 1}
              value={selectedIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setSelectedIndex(Number(e.target.value));
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[11px] font-mono text-zinc-500">
              <span>00:00 (Start: {flight.startTime})</span>
              <span>Połowa misji</span>
              <span>
                {formatMmSs(flight.durationSec)} (Koniec: {flight.endTime})
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-zinc-500 block">Wysokość (w {currentSec}s)</span>
              <span className="text-sm sm:text-base font-bold text-sky-400 tabular-nums">
                {currentSample.altitude.toFixed(2)} m
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-zinc-500 block">Napięcie 4S</span>
              <span className="text-sm sm:text-base font-bold text-amber-400 tabular-nums">
                {currentSample.batteryVoltage.toFixed(2)} V
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-zinc-500 block">Kąt Roll / Pitch</span>
              <span className="text-sm sm:text-base font-bold text-indigo-400 tabular-nums">
                {currentSample.roll.toFixed(1)}° / {currentSample.pitch.toFixed(1)}°
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-zinc-500 block">Kurs (Yaw)</span>
              <span className="text-sm sm:text-base font-bold text-zinc-200 tabular-nums">
                {currentSample.yaw.toFixed(0)}°
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/70">
              <span className="text-zinc-500 block">Stan systemu</span>
              <span
                className={`text-sm font-bold ${
                  currentSample.failsafe
                    ? "text-red-400"
                    : currentSample.isArmed
                    ? "text-emerald-400"
                    : "text-zinc-400"
                }`}
              >
                {currentSample.failsafe
                  ? "FAILSAFE!"
                  : currentSample.isArmed
                  ? "ARMED"
                  : "DISARMED"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sekcja 2: Kafelki ze statystykami podsumowującymi */}
      <section className="space-y-3">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Podsumowanie parametrów (Statystyki całej sesji)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Wysokość (AGL)</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Średnia</span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-zinc-100">
                  {stats.avgAltitude.toFixed(2)} m
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Maksymalna</span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-sky-400">
                  {stats.maxAltitude.toFixed(2)} m
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Pakiet LiPo 4S</span>
              <Battery className="w-4 h-4 text-amber-400" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Start</span>
                <span className="text-sm sm:text-base font-bold tabular-nums text-zinc-100">
                  {stats.startVoltage.toFixed(2)} V
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Średnie</span>
                <span className="text-sm sm:text-base font-bold tabular-nums text-zinc-300">
                  {stats.avgVoltage.toFixed(2)} V
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Min (Koniec)</span>
                <span className="text-sm sm:text-base font-bold tabular-nums text-amber-400">
                  {stats.minVoltage.toFixed(2)} V
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Wychylenia (Roll / Pitch)</span>
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Max Roll / Pitch</span>
                <span className="text-base sm:text-lg font-bold tabular-nums text-indigo-400">
                  {stats.maxRoll.toFixed(1)}° / {stats.maxPitch.toFixed(1)}°
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Śr. odchylenie</span>
                <span className="text-base sm:text-lg font-bold tabular-nums text-zinc-100">
                  {stats.avgRoll.toFixed(1)}° / {stats.avgPitch.toFixed(1)}°
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Rejestracja danych</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Zapisane próbki</span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-zinc-100">
                  {stats.totalSamples} pkt
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Failsafe</span>
                <span
                  className={`text-lg sm:text-xl font-bold ${
                    flight.hadFailsafe ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {flight.hadFailsafe ? "TAK" : "BRAK"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sekcja 3: Wykresy przebiegu czasowego zsynchronizowane z osią czasu */}
      <section className="space-y-4">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Wykresy przebiegu misji (zsynchronizowane z suwakiem 3D)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecordedFlightChart
            title="Profil wysokości barometrycznej (AGL)"
            samples={flight.samples}
            activeIndex={selectedIndex}
            onSelectIndex={(idx: number) => {
              setIsPlaying(false);
              setSelectedIndex(idx);
            }}
            yRange={[0, Math.ceil(stats.maxAltitude + 4)]}
            series={[
              {
                label: "Wysokość",
                color: "#38bdf8",
                unit: "m",
                extract: (p: TelemetryPacket) => p.altitude,
              },
            ]}
          />

          <RecordedFlightChart
            title="Krzywa rozładowania pakietu 4S LiPo"
            samples={flight.samples}
            activeIndex={selectedIndex}
            onSelectIndex={(idx: number) => {
              setIsPlaying(false);
              setSelectedIndex(idx);
            }}
            yRange={[13.5, 17.0]}
            series={[
              {
                label: "Napięcie",
                color: "#fbbf24",
                unit: "V",
                extract: (p: TelemetryPacket) => p.batteryVoltage,
              },
            ]}
          />
        </div>

        <RecordedFlightChart
          title="Przebieg orientacji kątowej (Roll & Pitch)"
          samples={flight.samples}
          activeIndex={selectedIndex}
          onSelectIndex={(idx: number) => {
            setIsPlaying(false);
            setSelectedIndex(idx);
          }}
          yRange={[-16, 16]}
          series={[
            {
              label: "Roll",
              color: "#818cf8",
              unit: "°",
              extract: (p: TelemetryPacket) => p.roll,
            },
            {
              label: "Pitch",
              color: "#c084fc",
              unit: "°",
              extract: (p: TelemetryPacket) => p.pitch,
            },
          ]}
        />
      </section>
    </div>
  );
}
