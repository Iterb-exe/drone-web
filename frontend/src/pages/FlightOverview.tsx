import { useEffect, useMemo, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import uPlot from "uplot";
import {
  ArrowLeft,
  Activity,
  Battery,
  Calendar,
  Clock,
  Compass,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getFlightAnalysis } from "../data/mockFlights";
import type { TelemetryPacket } from "../../../shared/types";
import type { SeriesConfig } from "../components/RealtimeChart";

interface HistoricalChartProps {
  title: string;
  packets: TelemetryPacket[];
  series: SeriesConfig[];
  yRange: [number, number];
}

function HistoricalChart({
  title,
  packets,
  series,
  yRange,
}: HistoricalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || packets.length === 0) return;

    const timestamps = packets.map((p) => p.timestampMs / 1000);
    const values = series.map((s) => packets.map((p) => s.extract(p)));
    const data: uPlot.AlignedData = [timestamps, ...values];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: window.innerWidth < 640 ? 220 : 280,
      scales: {
        x: { time: false },
        y: { range: yRange },
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
            vals.map((v) => `${v.toFixed(1)} ${series[0]?.unit ?? ""}`),
        },
      ],
      series: [
        {
          label: "Czas lotu",
          value: (_u, rawValue) =>
            rawValue != null
              ? `${rawValue.toFixed(1)} s`
              : `${timestamps[timestamps.length - 1].toFixed(0)} s (Koniec)`,
        },
        ...series.map((s, idx) => ({
          label: `${s.label} (${s.unit})`,
          stroke: s.color,
          width: 2,
          fill: `${s.color}18`,
          value: (u: uPlot, rawValue: number | null) => {
            if (rawValue != null) return `${rawValue.toFixed(2)} ${s.unit}`;
            const yArr = u.data[idx + 1];
            const lastY = yArr && yArr.length > 0 ? yArr[yArr.length - 1] : null;
            return lastY != null ? `${Number(lastY).toFixed(2)} ${s.unit}` : "--";
          },
        })),
      ],
    };

    const u = new uPlot(opts, data, containerRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        u.setSize({
          width: entry.contentRect.width,
          height: window.innerWidth < 640 ? 220 : 280,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      u.destroy();
    };
  }, [packets, series, yRange]);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
      <h3 className="text-sm sm:text-base font-semibold text-zinc-200">
        {title}
      </h3>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

export default function FlightOverview() {
  const { flightId } = useParams<{ flightId: string }>();

  const analysis = useMemo(
    () => (flightId ? getFlightAnalysis(flightId) : null),
    [flightId]
  );

  if (!analysis) {
    return <Navigate to="/" replace />;
  }

  const { record, stats, packets } = analysis;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Nagłówek i metadane lotu */}
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
            <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">
              {record.id}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                record.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {record.status === "COMPLETED" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {record.status === "COMPLETED"
                ? "Lot zakończony pomyślnie"
                : "Procedura Failsafe"}
            </span>
          </div>
        </div>

        {/* Pasek czasu i daty */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 block">Data lotu</span>
            <span className="font-semibold text-zinc-200 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {record.date}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Czas startu</span>
            <span className="font-mono font-semibold text-zinc-200 mt-0.5 block">
              {record.startTime}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Czas końca</span>
            <span className="font-mono font-semibold text-zinc-200 mt-0.5 block">
              {record.endTime}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Długość lotu</span>
            <span className="font-semibold text-sky-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {record.durationFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Sekcja statystyk: Średnie, Min, Max */}
      <section className="space-y-3">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Podsumowanie parametrów i wartości średnie
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Statystyki baterii */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Zasilanie (4S LiPo)</span>
              <Battery className="w-5 h-5 text-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Średnie</span>
                <span className="text-xl font-bold tabular-nums">
                  {stats.avgVoltage} V
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Minimalne</span>
                <span className="text-xl font-bold tabular-nums text-amber-400">
                  {stats.minVoltage} V
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800 flex justify-between">
              <span>Start: {stats.startVoltage} V</span>
              <span>Koniec: {stats.endVoltage} V</span>
            </div>
          </div>

          {/* Statystyki wysokości */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Wysokość (Baro)</span>
              <Activity className="w-5 h-5 text-sky-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Średnia</span>
                <span className="text-xl font-bold tabular-nums">
                  {stats.avgAltitude} m
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Maksymalna</span>
                <span className="text-xl font-bold tabular-nums text-sky-400">
                  {stats.maxAltitude} m
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              Liczba próbek: {packets.length} pkt
            </div>
          </div>

          {/* Statystyki kątów Roll / Pitch */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Dynamika (Roll / Pitch)</span>
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-zinc-500 block">Śr. odchylenie</span>
                <span className="text-lg font-bold tabular-nums">
                  {stats.avgRoll}° / {stats.avgPitch}°
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Maks. kąt</span>
                <span className="text-lg font-bold tabular-nums text-indigo-400">
                  {stats.maxRollAbs}° / {stats.maxPitchAbs}°
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              Oś podłużna i poprzeczna IMU
            </div>
          </div>

          {/* Bezpieczeństwo i Diagnostyka */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Bezpieczeństwo</span>
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="pt-1">
              <span className="text-xs text-zinc-500 block">Incydenty Failsafe</span>
              <span
                className={`text-xl font-bold ${
                  stats.failsafeTriggered ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {stats.failsafeTriggered ? "Wykryto (1)" : "Brak (0)"}
              </span>
            </div>
            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              Czas trwania: {record.durationSec} sekund
            </div>
          </div>
        </div>
      </section>

      {/* Sekcja wykresów całego lotu */}
      <section className="space-y-4">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Pełne przebiegi czasowe zarejestrowanego lotu
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HistoricalChart
            title="Profil wysokości (AGL)"
            packets={packets}
            yRange={[0, 18]}
            series={[
              {
                label: "Wysokość",
                color: "#38bdf8",
                unit: "m",
                extract: (p) => p.altitude,
              },
            ]}
          />

          <HistoricalChart
            title="Krzywa rozładowania baterii (4S)"
            packets={packets}
            yRange={[13.5, 17.0]}
            series={[
              {
                label: "Napięcie",
                color: "#fbbf24",
                unit: "V",
                extract: (p) => p.batteryVoltage,
              },
            ]}
          />
        </div>

        <HistoricalChart
          title="Przebieg orientacji kątowej (Roll & Pitch)"
          packets={packets}
          yRange={[-16, 16]}
          series={[
            {
              label: "Roll",
              color: "#818cf8",
              unit: "°",
              extract: (p) => p.roll,
            },
            {
              label: "Pitch",
              color: "#c084fc",
              unit: "°",
              extract: (p) => p.pitch,
            },
          ]}
        />
      </section>
    </div>
  );
}