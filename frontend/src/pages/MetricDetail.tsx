import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Activity, Battery, Compass, ShieldAlert } from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import RealtimeChart, { type SeriesConfig } from "../components/RealtimeChart";
import type { TelemetryPacket } from "../../../shared/types";

interface MetricPageConfig {
  title: string;
  description: string;
  icon: typeof Battery;
  iconColor: string;
  yRange: [number, number];
  formatCurrentValue: (t: TelemetryPacket) => string;
  series: SeriesConfig[];
}

const METRIC_CONFIGS: Record<string, MetricPageConfig> = {
  battery: {
    title: "Zasilanie pakietu (4S LiPo)",
    description: "Przebieg napięcia baterii w czasie rzeczywistym (zakres 13.0 V – 16.8 V).",
    icon: Battery,
    iconColor: "text-amber-400",
    yRange: [13.0, 17.0],
    formatCurrentValue: (t) => `${t.batteryVoltage.toFixed(2)} V`,
    series: [
      {
        label: "Napięcie",
        color: "#fbbf24",
        unit: "V",
        extract: (p) => p.batteryVoltage,
      },
    ],
  },
  altitude: {
    title: "Wysokość barometryczna (AGL)",
    description: "Wznoszenie i opadanie drona względem punktu startowego.",
    icon: Activity,
    iconColor: "text-sky-400",
    yRange: [0, 12],
    formatCurrentValue: (t) => `${t.altitude.toFixed(2)} m`,
    series: [
      {
        label: "Wysokość",
        color: "#38bdf8",
        unit: "m",
        extract: (p) => p.altitude,
      },
    ],
  },
  attitude: {
    title: "Orientacja przestrzenna (Roll / Pitch)",
    description: "Wykres wychyleń kątowych wokół osi podłużnej (Roll) oraz poprzecznej (Pitch).",
    icon: Compass,
    iconColor: "text-indigo-400",
    yRange: [-20, 20],
    formatCurrentValue: (t) =>
      `Roll: ${t.roll.toFixed(1)}° | Pitch: ${t.pitch.toFixed(1)}° | Yaw: ${t.yaw.toFixed(0)}°`,
    series: [
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
    ],
  },
  status: {
    title: "Status uzbrojenia i bezpieczeństwa",
    description: "Historia stanu uzbrojenia silników (1 = ARMED, 0 = DISARMED) oraz flagi Failsafe.",
    icon: ShieldAlert,
    iconColor: "text-emerald-400",
    yRange: [-0.2, 1.2],
    formatCurrentValue: (t) =>
      `${t.isArmed ? "ARMED" : "DISARMED"} (Failsafe: ${t.failsafe ? "TAK" : "NIE"})`,
    series: [
      {
        label: "Uzbrojenie (Armed)",
        color: "#34d399",
        unit: "stan",
        extract: (p) => (p.isArmed ? 1 : 0),
      },
      {
        label: "Failsafe",
        color: "#f87171",
        unit: "stan",
        extract: (p) => (p.failsafe ? 1 : 0),
      },
    ],
  },
};

export default function MetricDetail() {
  const { metricId } = useParams<{ metricId: string }>();
  const { displayTelemetry } = useTelemetry();

  const config = useMemo(
    () => (metricId ? METRIC_CONFIGS[metricId] : undefined),
    [metricId]
  );

  if (!config) {
    return <Navigate to="/" replace />;
  }

  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      {/* Nawigacja powrotna (Mobile-First) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do panelu głównego
          </Link>
          <div className="flex items-center gap-2.5">
            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
            <h2 className="text-xl sm:text-2xl font-bold">{config.title}</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">{config.description}</p>
        </div>

        {/* Podgląd bieżącej wartości (odświeżany co 400 ms) */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 self-start sm:self-auto min-w-[180px]">
          <span className="block text-xs text-zinc-400 mb-1">
            Aktualny odczyt
          </span>
          <span className="text-xl sm:text-2xl font-bold tabular-nums">
            {displayTelemetry ? config.formatCurrentValue(displayTelemetry) : "--"}
          </span>
        </div>
      </div>

      {/* Wykres uPlot (20 Hz) */}
      <RealtimeChart series={config.series} yRange={config.yRange} />
    </div>
  );
}