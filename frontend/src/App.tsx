import { useEffect, useState } from "react";
import { Activity, Battery, Compass, ShieldAlert } from "lucide-react";
import type { TelemetryPacket } from "../../shared/types";

export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryPacket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data: TelemetryPacket = JSON.parse(event.data);
        setTelemetry(data);
      } catch (err) {
        console.error("Błąd parsowania telemetrii:", err);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-zinc-100">
      <header className="flex justify-between items-center pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Drone Ground Station
          </h1>
          <p className="text-sm text-zinc-400">
            Panel telemetryczny stacji naziemnej
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
          />
          <span className="text-sm font-medium">
            {connected ? "Połączono (Live)" : "Rozłączono"}
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        {/* Kafel: Napięcie baterii */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Zasilanie (4S)</span>
            <Battery className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-3xl font-bold">
            {telemetry ? `${telemetry.batteryVoltage} V` : "--"}
          </span>
        </div>

        {/* Kafel: Wysokość */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Wysokość (Baro)</span>
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-3xl font-bold">
            {telemetry ? `${telemetry.altitude} m` : "--"}
          </span>
        </div>

        {/* Kafel: Orientacja (Roll / Pitch) */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Roll / Pitch</span>
            <Compass className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-2xl font-bold">
            {telemetry ? `${telemetry.roll}° / ${telemetry.pitch}°` : "--"}
          </span>
        </div>

        {/* Kafel: Status uzbrojenia */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Status</span>
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-400">
            {telemetry?.isArmed ? "ARMED" : "DISARMED"}
          </span>
        </div>
      </main>
    </div>
  );
}
