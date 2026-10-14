import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { connected } = useTelemetry();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 flex flex-col">
      <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pb-4 sm:pb-6 border-b border-zinc-800">
        {/* Grupa: Strona główna + Link do GitHuba */}
        <div className="flex items-center gap-3 sm:gap-4">
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

          {/* Przycisk GitHub */}
          <a
            href="https://github.com/Iterb-exe/drone-web"
            target="_blank"
            rel="noreferrer"
            title="Przejdź do repozytorium GitHub"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-100 transition-all text-xs font-medium"
          >
            <svg
              className="w-4 h-4 fill-current shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>

        {/* Pigułka statusu połączenia */}
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