import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Battery,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  Database,
  ShieldAlert,
} from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import { MOCK_FLIGHTS } from "../data/mockFlights";

export default function Dashboard() {
  const { displayTelemetry: t } = useTelemetry();

  const cards = [
    {
      id: "battery",
      title: "Zasilanie (4S)",
      value: t ? `${t.batteryVoltage.toFixed(2)} V` : "--",
      subtitle: "Napięcie ogniw LiPo",
      icon: Battery,
      iconColor: "text-amber-400",
      borderHover: "hover:border-amber-500/50",
    },
    {
      id: "altitude",
      title: "Wysokość (Baro)",
      value: t ? `${t.altitude.toFixed(2)} m` : "--",
      subtitle: "Wysokość względna AGL",
      icon: Activity,
      iconColor: "text-sky-400",
      borderHover: "hover:border-sky-500/50",
    },
    {
      id: "attitude",
      title: "Roll / Pitch",
      value: t ? `${t.roll.toFixed(1)}° / ${t.pitch.toFixed(1)}°` : "--",
      subtitle: "Orientacja kątowa IMU",
      icon: Compass,
      iconColor: "text-indigo-400",
      borderHover: "hover:border-indigo-500/50",
    },
    {
      id: "status",
      title: "Status systemu",
      value: t ? (t.isArmed ? "ARMED" : "DISARMED") : "--",
      subtitle: t?.failsafe ? "TRYB AWARYJNY (FAILSAFE)" : "Systemy w normie",
      icon: ShieldAlert,
      iconColor: "text-emerald-400",
      valueColor: t?.isArmed ? "text-emerald-400" : "text-zinc-400",
      borderHover: "hover:border-emerald-500/50",
    },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Sekcja 1: Telemetria na żywo */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Parametry lotu na żywo (kliknij kafelek, aby otworzyć wykres)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link
                key={card.id}
                to={`/metric/${card.id}`}
                className={`group p-5 sm:p-6 rounded-xl bg-zinc-900 border border-zinc-800 ${card.borderHover} transition-all active:scale-[0.98] flex flex-col justify-between gap-4`}
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-sm font-medium">{card.title}</span>
                  <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
                </div>

                <div>
                  <span
                    className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                      card.valueColor ?? "text-zinc-100"
                    }`}
                  >
                    {card.value}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <span>{card.subtitle}</span>
                  <span className="flex items-center gap-0.5 font-medium">
                    Wykres
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Sekcja 2: Tabela poprzednich lotów (Placeholder pod SQLite) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Historia zarejestrowanych lotów
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Dane testowe (docelowo baza SQLite)
          </span>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">ID Lotu</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Czas startu</th>
                  <th className="py-3.5 px-4">Czas końca</th>
                  <th className="py-3.5 px-4">Długość lotu</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Analiza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-xs sm:text-sm">
                {MOCK_FLIGHTS.map((flight) => (
                  <tr
                    key={flight.id}
                    className="hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="py-4 px-4 sm:px-6 font-mono font-semibold text-sky-400 whitespace-nowrap">
                      <Link
                        to={`/flight/${flight.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {flight.id}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-zinc-300 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {flight.date}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      {flight.startTime}
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      {flight.endTime}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {flight.durationFormatted}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flight.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {flight.status === "COMPLETED" ? "Zakończony" : "Failsafe"}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <Link
                        to={`/flight/${flight.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-sky-500 hover:text-zinc-950 text-zinc-200 font-medium text-xs transition-colors"
                      >
                        Pełny raport
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}