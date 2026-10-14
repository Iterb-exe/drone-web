import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TelemetryPacket } from "../../../shared/types";

type PacketListener = (history: TelemetryPacket[]) => void;

interface TelemetryContextType {
  /** Dane odświeżane wolniej (co 400 ms) dla czytelności liczb w UI */
  displayTelemetry: TelemetryPacket | null;
  connected: boolean;
  /** Zwraca ostatnie zapisane pakiety z bufora */
  getHistory: () => TelemetryPacket[];
  /** Subskrypcja pełnego strumienia 20 Hz dla wykresów uPlot */
  subscribeChart: (listener: PacketListener) => () => void;
}

const TelemetryContext = createContext<TelemetryContextType | null>(null);

const MAX_HISTORY_POINTS = 200; // 200 pakietów * 50 ms = 10 sekund historii na wykresie
const UI_THROTTLE_MS = 400;     // Aktualizacja tekstu w UI co 400 ms (2.5 raza na sekundę)

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [displayTelemetry, setDisplayTelemetry] = useState<TelemetryPacket | null>(null);
  const [connected, setConnected] = useState(false);

  const historyRef = useRef<TelemetryPacket[]>([]);
  const lastUiUpdateRef = useRef<number>(0);
  const listenersRef = useRef<Set<PacketListener>>(new Set());

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const packet: TelemetryPacket = JSON.parse(event.data);

        // 1. Zapis do bufora kołowego (pełne 20 Hz dla wykresów)
        historyRef.current.push(packet);
        if (historyRef.current.length > MAX_HISTORY_POINTS) {
          historyRef.current.shift();
        }

        // Powiadomienie aktywnego wykresu
        listenersRef.current.forEach((listener) => listener(historyRef.current));

        // 2. Throttling dla widoku liczb (aktualizacja stanu Reacta co 400 ms)
        const now = performance.now();
        if (now - lastUiUpdateRef.current >= UI_THROTTLE_MS) {
          lastUiUpdateRef.current = now;
          setDisplayTelemetry(packet);
        }
      } catch (err) {
        console.error("Błąd parsowania telemetrii:", err);
      }
    };

    return () => ws.close();
  }, []);

  const getHistory = () => historyRef.current;

  const subscribeChart = (listener: PacketListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  return (
    <TelemetryContext.Provider
      value={{ displayTelemetry, connected, getHistory, subscribeChart }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error("useTelemetry musi być użyty wewnątrz TelemetryProvider");
  }
  return ctx;
}