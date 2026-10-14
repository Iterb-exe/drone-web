import type { TelemetryPacket } from "../../../shared/types";

export interface FlightRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationFormatted: string;
  durationSec: number;
  status: "COMPLETED" | "FAILSAFE";
}

export interface FlightStats {
  avgAltitude: number;
  maxAltitude: number;
  avgVoltage: number;
  minVoltage: number;
  startVoltage: number;
  endVoltage: number;
  avgRoll: number;
  maxRollAbs: number;
  avgPitch: number;
  maxPitchAbs: number;
  failsafeTriggered: boolean;
}

export interface FlightFullAnalysis {
  record: FlightRecord;
  stats: FlightStats;
  packets: TelemetryPacket[];
}

export const MOCK_FLIGHTS: FlightRecord[] = [
  {
    id: "FLT-2026-004",
    date: "2026-10-14",
    startTime: "14:10:12",
    endTime: "14:18:42",
    durationFormatted: "08m 30s",
    durationSec: 510,
    status: "COMPLETED",
  },
  {
    id: "FLT-2026-003",
    date: "2026-10-13",
    startTime: "17:45:00",
    endTime: "17:51:15",
    durationFormatted: "06m 15s",
    durationSec: 375,
    status: "COMPLETED",
  },
  {
    id: "FLT-2026-002",
    date: "2026-10-12",
    startTime: "12:20:30",
    endTime: "12:24:10",
    durationFormatted: "03m 40s",
    durationSec: 220,
    status: "FAILSAFE",
  },
  {
    id: "FLT-2026-001",
    date: "2026-10-10",
    startTime: "10:05:00",
    endTime: "10:15:20",
    durationFormatted: "10m 20s",
    durationSec: 620,
    status: "COMPLETED",
  },
];

export function getFlightAnalysis(flightId: string): FlightFullAnalysis | null {
  const record = MOCK_FLIGHTS.find((f) => f.id === flightId);
  if (!record) return null;

  // Deterministyczny seed na podstawie ID lotu
  const seed = flightId.charCodeAt(flightId.length - 1);
  const sampleCount = 200;
  const packets: TelemetryPacket[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const progress = i / (sampleCount - 1);
    const timeSec = progress * record.durationSec;

    // Symulacja profilu wysokości (start -> przelot -> lądowanie)
    const envelope = Math.sin(progress * Math.PI);
    const altitude = Number(
      Math.max(
        0,
        envelope * (12 + (seed % 5)) + Math.sin(i * 0.2 + seed) * 1.5
      ).toFixed(2)
    );

    const roll = Number((Math.sin(i * 0.15 + seed) * 12 * envelope).toFixed(2));
    const pitch = Number((Math.cos(i * 0.12 + seed) * 9 * envelope).toFixed(2));
    const yaw = Number(((i * 4 + seed * 10) % 360).toFixed(2));

    // Rozładowanie pakietu 4S od 16.6V w dół
    const batteryVoltage = Number(
      (16.6 - progress * 2.1 - Math.sin(i * 0.3) * 0.08).toFixed(2)
    );

    const isFailsafeFlight = record.status === "FAILSAFE";
    const failsafe = isFailsafeFlight && progress > 0.8;

    packets.push({
      timestampMs: Math.round(timeSec * 1000),
      roll,
      pitch,
      yaw,
      altitude,
      batteryVoltage,
      isArmed: progress < 0.98,
      failsafe,
    });
  }

  const sum = (fn: (p: TelemetryPacket) => number) =>
    packets.reduce((acc, p) => acc + fn(p), 0);

  const stats: FlightStats = {
    avgAltitude: Number((sum((p) => p.altitude) / packets.length).toFixed(2)),
    maxAltitude: Number(Math.max(...packets.map((p) => p.altitude)).toFixed(2)),
    avgVoltage: Number(
      (sum((p) => p.batteryVoltage) / packets.length).toFixed(2)
    ),
    minVoltage: Number(
      Math.min(...packets.map((p) => p.batteryVoltage)).toFixed(2)
    ),
    startVoltage: packets[0].batteryVoltage,
    endVoltage: packets[packets.length - 1].batteryVoltage,
    avgRoll: Number((sum((p) => Math.abs(p.roll)) / packets.length).toFixed(2)),
    maxRollAbs: Number(
      Math.max(...packets.map((p) => Math.abs(p.roll))).toFixed(2)
    ),
    avgPitch: Number(
      (sum((p) => Math.abs(p.pitch)) / packets.length).toFixed(2)
    ),
    maxPitchAbs: Number(
      Math.max(...packets.map((p) => Math.abs(p.pitch))).toFixed(2)
    ),
    failsafeTriggered: packets.some((p) => p.failsafe),
  };

  return { record, stats, packets };
}