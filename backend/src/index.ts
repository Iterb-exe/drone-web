import { WebSocketServer, WebSocket } from 'ws';
import { TelemetryPacket } from '../../shared/types';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Backend] Stacja naziemna nasłuchuje na ws://localhost:${PORT}`);

let t = 0;
function generateMockPacket(): TelemetryPacket {
  t += 0.05;
  return {
    timestampMs: Math.floor(t * 1000),
    roll: Number((Math.sin(t) * 15).toFixed(2)),
    pitch: Number((Math.cos(t * 0.8) * 10).toFixed(2)),
    yaw: Number(((t * 10) % 360).toFixed(2)),
    altitude: Number((Math.max(0, Math.sin(t * 0.3) * 5 + 5)).toFixed(2)),
    batteryVoltage: Number((Math.max(13.8, 16.4 - t * 0.005)).toFixed(2)),
    isArmed: true,
    failsafe: false,
  };
}

setInterval(() => {
  if (wss.clients.size === 0) return;
  const packet = JSON.stringify(generateMockPacket());
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(packet);
    }
  });
}, 50);

wss.on('connection', (ws) => {
  console.log('[Backend] Podłączono klienta UI (React)');
  ws.on('close', () => console.log('[Backend] Rozłączono klienta UI'));
});
