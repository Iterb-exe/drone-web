export interface TelemetryPacket {
  timestampMs: number;
  roll: number;            // Kąt w stopniach (-180 do 180)
  pitch: number;           // Kąt w stopniach (-90 do 90)
  yaw: number;             // Kąt w stopniach (0 do 360)
  altitude: number;        // Wysokość w metrach
  batteryVoltage: number;  // Napięcie pakietu w woltach (np. 14.0 - 16.8)
  isArmed: boolean;        // Stan uzbrojenia silników
  failsafe: boolean;       // Flaga procedury awaryjnej
}
