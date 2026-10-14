# Drone Ground Control Station (GCS) — Web



A lightweight, real-time Ground Control Station (GCS) web application designed for telemetry acquisition, live 1:1 metric 3D attitude and altitude visualization, high-frequency time-series plotting, and post-flight mission debriefing for an unmanned aerial vehicle (UAV / quadcopter).



The system is organized as a lightweight monorepo comprising a Node.js hardware/telemetry bridge (WebSockets) and a mobile-first React operator dashboard (Vite + Tailwind CSS v4 + Three.js + uPlot + React Router).



---



## 🚀 Architecture Overview



```text

drone-web/

├── backend/            # Telemetry bridge server (Node.js + WebSockets)

│   ├── src/

│   │   └── index.ts    # WS server & synthetic telemetry generator (20 Hz)

│   ├── package.json

│   └── tsconfig.json

├── frontend/           # Operator cockpit SPA (React 19 + TypeScript + Vite)

│   ├── src/

│   │   ├── components/ # Reusable UI (Layout, RealtimeChart, DroneAttitude3D)

│   │   ├── context/    # TelemetryContext (WS connection, dual-rate throttling)

│   │   ├── data/       # Historical session datasets (mockFlights pending SQLite)

│   │   ├── pages/      # Views (Dashboard, MetricDetail, FlightOverview)

│   │   ├── App.tsx     # Application router configuration

│   │   └── index.css   # Tailwind CSS v4 & uPlot theme rules

│   ├── package.json

│   └── vite.config.ts

├── shared/             # Shared TypeScript types & data contracts

│   └── types.ts        # TelemetryPacket definition

└── package.json        # Root process orchestrator (concurrently)

```



### Technology Stack



- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, `react-router-dom`, `lucide-react`, `uPlot` (high-frequency Canvas plotting), Three.js / `@react-three/fiber` & `@react-three/drei` (true 1:1 metric scale 3D attitude & AGL altitude indicator).

- **Backend:** Node.js, TypeScript, `ws` (native WebSockets), `tsx` (TypeScript runtime watch).

- **Key Architectural Features:** 

  - **Mobile-First Design:** Responsive layout adapting fluidly from smartphones and tablets to wide multi-monitor desktop stations.

  - **Dual-Rate Telemetry Stream:** High-frequency 20 Hz (50 ms) data pump dedicated to canvas charts and 60 FPS 3D interpolation, coupled with a 2.5 Hz (400 ms) throttled state for jitter-free textual metric readouts.

  - **True 1:1 Metric 3D Visualization ($50\text{ cm} \times 50\text{ cm} \times 50\text{ cm}$):** Procedural X-frame quadcopter scaled to $0.5\text{ m}$ dimensions in a true $1:1$ metric coordinate space ($1\text{ unit} = 1\text{ m}$). Features shortest-path angular interpolation (`atan2` wrap-around safe across $359^\circ \to 0^\circ$), a vertical $1\text{ m} / 5\text{ m}$ altitude ruler, dynamic camera tracking, and full-column overview mode.

  - **Interactive Flight Replay (Timeline Scrubber):** Full post-flight 3D reconstruction with Play/Pause/Speed ($1\times$, $2\times$, $5\times$) controls and non-blocking synchronized crosshairs across historical `uPlot` charts.

  - **Shared Contract:** Zero-overhead type sharing across backend and frontend via `shared/types.ts`.



---



## 📡 Telemetry Protocol Contract



Both frontend and backend rely on the strict single source of truth defined in `shared/types.ts`:



```typescript

export interface TelemetryPacket {

  timestampMs: number;    // Elapsed flight controller uptime (ms)

  roll: number;           // Attitude roll in degrees (-180 to 180)

  pitch: number;          // Attitude pitch in degrees (-90 to 90)

  yaw: number;            // Attitude yaw in degrees (0 to 360)

  altitude: number;       // Barometric altitude in meters (AGL)

  batteryVoltage: number; // 4S LiPo battery pack voltage (14.0 V - 16.8 V)

  isArmed: boolean;       // Motor arm state

  failsafe: boolean;      // Active failsafe emergency flag

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



Using SSH (recommended on Linux/macOS):

```bash

git clone git@github.com:Iterb-exe/drone-web.git

cd drone-web

```



Using HTTPS (recommended on Windows):

```bash

git clone https://github.com/Iterb-exe/drone-web.git

cd drone-web

```



### 2. Install Dependencies



Because the project uses independent `package.json` manifests for root orchestration, backend, and frontend, install dependencies across all three layers:



```bash

# 1. Install root dependencies (concurrently orchestrator)

npm install



# 2. Install backend dependencies (ws, tsx, typescript)

cd backend

npm install

cd ..



# 3. Install frontend dependencies (React, Vite, Tailwind v4, Router, uPlot, Three)

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



This starts both services concurrently with unified terminal logs:



- **Backend Bridge:** `ws://localhost:8080` (broadcasts simulated 20 Hz telemetry frames).

- **Frontend Dashboard:** `http://localhost:5173` (Vite dev server with Hot Module Replacement).



Open your browser and navigate to:



```text

http://localhost:5173

```



---



## 🌟 Current Capabilities



The station currently operates in **Mock Telemetry Mode**, allowing full UI, 3D, and charting development independent of physical drone hardware:



- **Live HUD Dashboard (`/`):** Instant overview of battery status (4S LiPo), barometric height, IMU attitude angles, armed/failsafe status flags, and a live 3D orientation/elevation viewport.

- **1:1 Metric 3D Attitude & Altitude Indicator (`DroneAttitude3D`):** Real-time 60 FPS interpolated quadcopter model ($50\text{ cm} \times 50\text{ cm} \times 50\text{ cm}$ envelope) moving in true $1:1$ metric elevation ($1\text{ unit} = 1\text{ m}$) alongside a vertical $1\text{ m} / 5\text{ m}$ graduated altitude mast, shortest-path Yaw interpolation, camera follow/column modes, and a $50\text{ cm}$ wireframe bounding box toggle.

- **Responsive Flight Log Table:** Overview of previous flight sessions (start time, end time, total duration, and completion status) formatted for both mobile cards and desktop tables.

- **Deep Metric Views (`/metric/:metricId`):** Dedicated real-time 20 Hz `uPlot` charts for individual flight parameters with live summary strips (current, min, and max values).

- **Post-Flight Analysis & 3D Replay (`/flight/:flightId`):** Mission debriefing view featuring an interactive timeline scrubber, 3D flight playback ($1\times$/$2\times$/$5\times$), aggregated session statistics, and click-to-seek synchronized historical charts.



---



## 🔧 Troubleshooting & Common Issues



### 1. `Firefox can't establish a connection to ws://localhost:8080`

- Check the terminal tab to ensure the backend process is running without errors.

- Verify that port `8080` is not blocked or occupied by another process (`lsof -i :8080` on Linux, `netstat -ano | findstr :8080` on Windows).



### 2. TypeScript Import Errors in Browser (`does not provide an export named...`)

- When importing interfaces from `shared/types.ts` into frontend files, always use explicit type-only import syntax:

  ```typescript

  import type { TelemetryPacket } from "../../shared/types";

  ```

  This ensures the Vite compiler strips the interface completely during bundling, avoiding runtime module resolution errors.



### 3. Windows Native Build Errors (`node-gyp rebuild failed`)

- Native C++ database drivers (e.g., `better-sqlite3`) require Visual Studio C++ Build Tools on Windows. The project currently isolates flight history in a pure TypeScript mock layer (`src/data/mockFlights.ts`) during prototyping to guarantee zero-friction cross-platform development.



---



## 🗺️ Development Roadmap



- [x] Monorepo scaffold with concurrent development pipeline.

- [x] High-frequency WebSocket telemetry bridge with mock packet generator.

- [x] Responsive Mobile-First HUD cards for live flight metrics.

- [x] Real-time 20 Hz time-series charts using `uPlot` with dual-rate UI throttling.

- [x] Multi-view routing (`/`, `/metric/:metricId`, `/flight/:flightId`) via `react-router-dom`.

- [x] Flight session history debriefing interface with min/max/average metrics.

- [x] True 1:1 metric 3D attitude & AGL altitude visualization utilizing `@react-three/fiber` ($50\text{ cm}$ quadcopter + historical timeline replay).

- [ ] Persistent flight logging to local SQLite database via cross-platform storage adapter.

- [ ] Hardware UART integration using Node.js `serialport` for live STM32 flight controller telemetry.



---



## 📄 License



This project is developed as part of an engineering diploma thesis. All rights reserved.