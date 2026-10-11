# Drone Ground Control Station (GCS) — Web

A lightweight, real-time Ground Control Station (GCS) web application designed for telemetry acquisition, live 3D visualization, time-series plotting, and flight data persistence for an unmanned aerial vehicle (UAV / quadcopter).

The system is organized as a lightweight monorepo comprising a Node.js hardware/telemetry bridge (WebSockets + SQLite) and a modern React operator dashboard (Vite + Tailwind CSS).

---

## 🚀 Architecture Overview

```text

drone-web/

├── backend/            # Telemetry bridge server (Node.js + WebSockets + SQLite)

│   ├── src/

│   │   └── index.ts    # WS server & synthetic telemetry generator (20 Hz)

│   ├── package.json

│   └── tsconfig.json

├── frontend/           # Operator cockpit UI (React + TypeScript + Vite)

│   ├── src/

│   │   ├── App.tsx     # Main telemetry dashboard view

│   │   └── index.css   # Tailwind CSS v4 styling rules

│   ├── package.json

│   └── vite.config.ts

├── shared/             # Shared TypeScript types & data contracts

│   └── types.ts        # TelemetryPacket definition

└── package.json        # Root process orchestrator (concurrently)

```

### Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Three.js / `@react-three/fiber` (3D attitude indicator), `uPlot` (high-frequency Canvas charts).

- **Backend:** Node.js, TypeScript, `ws` (native WebSockets), `better-sqlite3` (low-overhead flight database), `tsx` (TypeScript execute & watch runtime).

- **Telemetry Streaming:** WebSockets (`ws://localhost:8080`) streaming at 20 Hz (50 ms packet intervals).

---

## 📡 Telemetry Protocol Contract

Both frontend and backend rely on a shared single source of truth defined in `shared/types.ts`:

```typescript
export interface TelemetryPacket {
  timestampMs: number; // Elapsed flight controller uptime (ms)

  roll: number; // Attitude roll in degrees (-180 to 180)

  pitch: number; // Attitude pitch in degrees (-90 to 90)

  yaw: number; // Attitude yaw in degrees (0 to 360)

  altitude: number; // Barometric altitude in meters

  batteryVoltage: number; // 4S LiPo battery pack voltage (14.0 V - 16.8 V)

  isArmed: boolean; // Motor arm state

  failsafe: boolean; // Active failsafe emergency flag
}
```

---

## 📋 Prerequisites

Ensure the following tools are installed on your development machine:

- **Node.js**: `v20.x` or later (LTS recommended)

- **npm**: `v10.x` or later

- **Git**

Verify your environment versions:

```bash

node -v

npm -v

git --version

```

---

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository

```bash

git clone git@github.com:Iterb-exe/drone-web.git

cd drone-web

```

### 2. Install Dependencies

Because the project uses independent `package.json` manifests for root orchestration, backend, and frontend, install dependencies across all three layers:

```bash

# 1. Install root dependencies (concurrently process runner)

npm install



# 2. Install backend dependencies (ws, better-sqlite3, tsx)

cd backend

npm install

cd ..



# 3. Install frontend dependencies (React, Vite, Tailwind, 3D & chart libraries)

cd frontend

npm install

cd ..

```

---

## ▶️ Running the Development Environment

From the root `drone-web` directory, execute:

```bash

npm run dev

```

This starts both services concurrently with colored terminal output:

- **Backend Bridge:** `ws://localhost:8080` (broadcasts simulated 20 Hz telemetry frames).

- **Frontend Dashboard:** `http://localhost:5173` (Vite dev server with Hot Module Replacement).

Open your browser and navigate to:

```text

http://localhost:5173

```

---

## 🌟 Current Capabilities (Mock Mode)

The station currently operates in **Mock Telemetry Mode**, allowing complete UI development independent of physical drone hardware:

- **Real-time WebSocket Stream:** Backend continuously generates smooth trigonometric sinusoidal fluctuations for Roll, Pitch, Yaw, barometric altitude, and a realistic battery discharge slope for a 4S LiPo.

- **Connection Health Monitor:** Visual status indicator displaying `Połączono (Live)` / `Rozłączono` in real time.

- **Telemetry HUD Cards:** Instant rendering of battery voltage, barometric height, attitude angles, and ARM/DISARM motor status.

---

## 🔧 Troubleshooting & Common Issues

### 1. `Firefox can't establish a connection to ws://localhost:8080`

- Check the backend terminal tab to ensure the server initialized successfully and did not crash on startup.

- Ensure port `8080` is not in use by another local process (`lsof -i :8080`).

### 2. TypeScript Import Syntax Errors in Browser (`does not provide an export named...`)

- When importing interfaces from `shared/types.ts` into frontend files, always use explicit type-only import syntax:

  ```typescript
  import type { TelemetryPacket } from "../../shared/types";
  ```

  This ensures the Vite bundler completely strips the interface during bundling and prevents runtime module export lookup errors.

---

## 🗺️ Development Roadmap

- [x] Monorepo scaffold with concurrent development pipeline.

- [x] High-frequency WebSocket telemetry bridge with mock packet generator.

- [x] Real-time HUD cards for flight parameters.

- [ ] 3D attitude visualization utilizing `@react-three/fiber` (CAD quadcopter orientation).

- [ ] High-performance time-series charts using `uPlot` (altitude profile and voltage curve).

- [ ] Session flight logging to local SQLite database via `better-sqlite3`.

- [ ] Hardware UART integration using Node.js `serialport` for live STM32 flight controller telemetry.

---

## 📄 License

This project is developed as part of an engineering diploma thesis. All rights reserved.
