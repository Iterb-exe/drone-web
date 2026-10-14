import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { connected } = useTelemetry();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 flex flex-col">
      <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pb-4 sm:pb-6 border-b border-zinc-800">
        <Link to="/" className="group flex items-center gap-3 w-fit">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
            <Radio className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
              Drone Ground Station
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Panel telemetryczny stacji naziemnej
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-xs sm:text-sm font-medium text-zinc-300">
            {connected ? "Połączono (Live)" : "Rozłączono"}
          </span>
        </div>
      </header>

      <main className="flex-1 mt-6 sm:mt-8">{children}</main>
    </div>
  );
}