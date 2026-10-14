import { Link } from "react-router-dom";
import {
  Activity,
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
import DroneAttitude3D from "../components/DroneAttitude3D";

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
            Telemetria na żywo (kliknij kafelek, aby otworzyć wykres)
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

      {/* Sekcja 2: Wizualizacja 3D orientacji drona na żywo */}
      <section className="space-y-3">
        <DroneAttitude3D compact />
      </section>

      {/* Sekcja 3: Tabela historii lotów (Placeholder pod SQLite) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Historia zapisanych lotów
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Dane demonstracyjne (docelowo baza SQLite)
          </span>
        </div>

        {/* Widok Mobile (< md): Karty lotów */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {MOCK_FLIGHTS.map((flight) => (
            <Link
              key={flight.id}
              to={`/flight/${flight.id}`}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.99] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-sky-400">
                  {flight.id}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    flight.hadFailsafe
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {flight.hadFailsafe ? "Failsafe" : "Pomyślny"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{flight.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{flight.durationFormatted}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                <span>
                  Start: <strong className="text-zinc-200">{flight.startTime}</strong> | Koniec:{" "}
                  <strong className="text-zinc-200">{flight.endTime}</strong>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </div>
            </Link>
          ))}
        </div>

        {/* Widok Desktop (>= md): Pełna tabela */}
        <div className="hidden md:block overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5">ID Lotu</th>
                <th className="py-3.5 px-5">Data</th>
                <th className="py-3.5 px-5">Czas startu</th>
                <th className="py-3.5 px-5">Czas końca</th>
                <th className="py-3.5 px-5">Długość lotu</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Analiza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-sm">
              {MOCK_FLIGHTS.map((flight) => (
                <tr
                  key={flight.id}
                  className="hover:bg-zinc-800/40 transition-colors group"
                >
                  <td className="py-4 px-5 font-mono font-semibold text-sky-400">
                    <Link to={`/flight/${flight.id}`} className="hover:underline">
                      {flight.id}
                    </Link>
                  </td>
                  <td className="py-4 px-5 text-zinc-300 tabular-nums">
                    {flight.date}
                  </td>
                  <td className="py-4 px-5 text-zinc-300 tabular-nums">
                    {flight.startTime}
                  </td>
                  <td className="py-4 px-5 text-zinc-300 tabular-nums">
                    {flight.endTime}
                  </td>
                  <td className="py-4 px-5 font-medium text-zinc-100 tabular-nums">
                    {flight.durationFormatted}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        flight.hadFailsafe
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {flight.hadFailsafe ? "Epizod Failsafe" : "Pomyślny"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <Link
                      to={`/flight/${flight.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-100 transition-colors"
                    >
                      Pełny raport
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}