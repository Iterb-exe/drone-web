import { useEffect, useRef } from "react";
import uPlot from "uplot";
import { useTelemetry } from "../context/TelemetryContext";
import type { TelemetryPacket } from "../../../shared/types";

export interface SeriesConfig {
  label: string;
  color: string;
  unit: string;
  extract: (packet: TelemetryPacket) => number;
}

interface RealtimeChartProps {
  series: SeriesConfig[];
  yRange: [number, number];
}

export default function RealtimeChart({ series, yRange }: RealtimeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const { getHistory, subscribeChart, displayTelemetry } = useTelemetry();

  useEffect(() => {
    if (!containerRef.current) return;

    const buildPlotData = (packets: TelemetryPacket[]): uPlot.AlignedData => {
      const timestamps = packets.map((p) => p.timestampMs / 1000);
      const values = series.map((s) => packets.map((p) => s.extract(p)));
      return [timestamps, ...values];
    };

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: window.innerWidth < 640 ? 260 : 380,
      scales: {
        x: { time: false },
        y: { range: yRange },
      },
      axes: [
        {
          stroke: "#71717a",
          grid: { stroke: "#27272a", width: 1 },
          values: (_u, vals) => vals.map((v) => `${v.toFixed(1)}s`),
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
          label: "Czas (s)",
          value: (u, rawValue) => {
            if (rawValue != null) return `${rawValue.toFixed(2)} s`;
            const xArr = u.data[0];
            const lastX = xArr && xArr.length > 0 ? xArr[xArr.length - 1] : null;
            return lastX != null ? `${lastX.toFixed(1)} s (Live)` : "--";
          },
        },
        ...series.map((s, idx) => ({
          label: `${s.label} (${s.unit})`,
          stroke: s.color,
          width: 2,
          fill: `${s.color}18`,
          value: (u: uPlot, rawValue: number | null) => {
            // Jeśli kursor wskazuje punkt na wykresie, pokaż wartość spod kursora
            if (rawValue != null) return `${rawValue.toFixed(2)} ${s.unit}`;
            // Jeśli nic nie jest zaznaczone, pokaż najnowszą wartość z końca tablicy
            const yArr = u.data[idx + 1];
            const lastY = yArr && yArr.length > 0 ? yArr[yArr.length - 1] : null;
            return lastY != null ? `${Number(lastY).toFixed(2)} ${s.unit}` : "--";
          },
        })),
      ],
    };

    const initialData = buildPlotData(getHistory());
    const u = new uPlot(opts, initialData, containerRef.current);
    plotRef.current = u;

    const unsubscribe = subscribeChart((updatedHistory) => {
      u.setData(buildPlotData(updatedHistory));
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (plotRef.current) {
          plotRef.current.setSize({
            width: entry.contentRect.width,
            height: window.innerWidth < 640 ? 260 : 380,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      u.destroy();
    };
  }, [series, yRange, getHistory, subscribeChart]);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 sm:p-5 space-y-4">
      <div ref={containerRef} className="w-full" />

      {/* Pasek aktualnych wartości pod wykresem */}
      <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-zinc-400">
          Aktualne wartości na żywo (najedź na wykres, aby sprawdzić historię):
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {series.map((s) => {
            const currentVal = displayTelemetry
              ? s.extract(displayTelemetry).toFixed(2)
              : "--";
            return (
              <div
                key={s.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-zinc-400">{s.label}:</span>
                <span className="text-sm font-bold tabular-nums text-zinc-100">
                  {currentVal} {s.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}