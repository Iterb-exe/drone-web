import type { TelemetryPacket } from "../../../shared/types";

export interface FlightRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  durationFormatted: string;
  status: "COMPLETED" | "FAILSAFE";
  hadFailsafe: boolean;
  notes: string;
  samples: TelemetryPacket[];
}

function generateFlightSamples(
  durationSec: number,
  seed: number,
  hadFailsafe: boolean
): TelemetryPacket[] {
  const samples: TelemetryPacket[] = [];
  const stepSec = 1;

  for (let t = 0; t <= durationSec; t += stepSec) {
    const progress = t / durationSec;
    const envelope = Math.sin(progress * Math.PI);
    const altitude = Number(
      Math.max(
        0,
        envelope * (14 + seed * 3) + Math.sin(t * 0.15 + seed) * 1.5
      ).toFixed(2)
    );

    const roll = Number((Math.sin(t * 0.25 + seed) * 12 * envelope).toFixed(2));
    const pitch = Number((Math.cos(t * 0.2 + seed) * 9 * envelope).toFixed(2));
    const yaw = Number(((t * 6 + seed * 45) % 360).toFixed(1));

    const batteryVoltage = Number(
      (16.8 - progress * (2.1 + seed * 0.15) - Math.sin(t * 0.3) * 0.08).toFixed(2)
    );

    samples.push({
      timestampMs: t * 1000,
      roll,
      pitch,
      yaw,
      altitude,
      batteryVoltage,
      isArmed: t > 2 && t < durationSec - 2,
      failsafe: hadFailsafe && progress > 0.75 && progress < 0.85,
    });
  }

  return samples;
}

export const MOCK_FLIGHTS: FlightRecord[] = [
  {
    id: "FLT-2026-004",
    date: "2026-10-14",
    startTime: "14:12:05",
    endTime: "14:20:45",
    durationSec: 520,
    durationFormatted: "08m 40s",
    status: "COMPLETED",
    hadFailsafe: false,
    notes: "Lot testowy PID – stabilizacja w osi Roll/Pitch przy wietrze bocznym.",
    samples: generateFlightSamples(520, 1, false),
  },
  {
    id: "FLT-2026-003",
    date: "2026-10-13",
    startTime: "17:40:10",
    endTime: "17:46:30",
    durationSec: 380,
    durationFormatted: "06m 20s",
    status: "COMPLETED",
    hadFailsafe: false,
    notes: "Test zawisu barometrycznego (AltHold) i pomiar spadku napięcia 4S.",
    samples: generateFlightSamples(380, 2, false),
  },
  {
    id: "FLT-2026-002",
    date: "2026-10-12",
    startTime: "11:05:00",
    endTime: "11:09:15",
    durationSec: 255,
    durationFormatted: "04m 15s",
    status: "FAILSAFE",
    hadFailsafe: true,
    notes: "Próba procedury Failsafe po krótkotrwałym zaniku linku RC.",
    samples: generateFlightSamples(255, 3, true),
  },
  {
    id: "FLT-2026-001",
    date: "2026-10-10",
    startTime: "15:22:30",
    endTime: "15:32:00",
    durationSec: 570,
    durationFormatted: "09m 30s",
    status: "COMPLETED",
    hadFailsafe: false,
    notes: "Pierwszy oblot pełnego profilu zasilania i kalibracja magnetometru.",
    samples: generateFlightSamples(570, 4, false),
  },
];
