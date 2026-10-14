import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Compass, RotateCcw, ArrowUpDown, Box, Eye } from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import type { TelemetryPacket } from "../../../shared/types";

// Poziom ziemi: y = 0.0 m (1 jednostka w Three.js = 1.0 metr w rzeczywistości)
const GROUND_Y = 0;
// Rozmiar gabarytowy drona: 0.50 m = 50 cm
const DRONE_BOUNDS_M = 0.5;
// Odległość od spodu płóz drona do środka jego układu współrzędnych
const LANDING_GEAR_OFFSET_M = 0.045;

/**
 * Interpolacja kątowa po najkrótszym łuku okręgu.
 * Zapobiega gwałtownemu obrotowi o 360 stopni przy przejściu 359° -> 0°.
 */
function lerpAngleRad(current: number, target: number, t: number): number {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current)
  );
  return current + delta * t;
}

interface QuadcopterModelProps {
  targetTelemetry: React.MutableRefObject<TelemetryPacket | null>;
  lockYaw: boolean;
  enableAltitude3D: boolean;
  showBoundingBox: boolean;
  cameraFollowDrone: boolean;
  controlsRef: React.MutableRefObject<any>;
}

function QuadcopterModel({
  targetTelemetry,
  lockYaw,
  enableAltitude3D,
  showBoundingBox,
  cameraFollowDrone,
  controlsRef,
}: QuadcopterModelProps) {
  const droneGroupRef = useRef<THREE.Group>(null);
  const propRefs = useRef<(THREE.Mesh | null)[]>([]);
  const altitudeStemRef = useRef<THREE.Mesh>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);
  const prevCameraTargetYRef = useRef<number>(LANDING_GEAR_OFFSET_M);

  useFrame((state, delta) => {
    if (!droneGroupRef.current) return;

    const packet = targetTelemetry.current;
    const rollDeg = packet ? packet.roll : 0;
    const pitchDeg = packet ? packet.pitch : 0;
    const yawDeg = packet && !lockYaw ? packet.yaw : 0;
    const altitudeMeters = packet ? Math.max(0, packet.altitude) : 0;
    const isArmed = packet ? packet.isArmed : false;

    const smoothing = Math.min(1, delta * 12);

    // 1. Rzeczywista wysokość 1:1 w metrach (np. 21 m = 21.0 jednostek nad ziemią, czyli 42 długości drona 50 cm)
    const targetY = enableAltitude3D
      ? GROUND_Y + LANDING_GEAR_OFFSET_M + altitudeMeters
      : GROUND_Y + LANDING_GEAR_OFFSET_M;

    droneGroupRef.current.position.y = THREE.MathUtils.lerp(
      droneGroupRef.current.position.y,
      targetY,
      smoothing
    );

    const currentDroneY = droneGroupRef.current.position.y;
    const heightAboveGround = Math.max(0.005, currentDroneY - GROUND_Y);

    // 2. Aktualizacja pionowej kolumny wysokości (od ziemi y=0 do spodu drona)
    if (altitudeStemRef.current) {
      altitudeStemRef.current.position.y = GROUND_Y + heightAboveGround / 2;
      altitudeStemRef.current.scale.set(1, heightAboveGround, 1);
    }

    // Pierścień rzutowania na ziemi (średnica 50 cm = obrys drona)
    if (groundRingRef.current) {
      groundRingRef.current.position.y = GROUND_Y + 0.003;
    }

    // 3. Płynne prowadzenie kamery za wznoszącym się dronem w skali 1:1
    if (controlsRef.current) {
      const desiredTargetY = cameraFollowDrone
        ? currentDroneY
        : Math.max(0.5, currentDroneY * 0.5);

      const newTargetY = THREE.MathUtils.lerp(
        prevCameraTargetYRef.current,
        desiredTargetY,
        smoothing
      );
      const deltaY = newTargetY - prevCameraTargetYRef.current;

      controlsRef.current.target.y = newTargetY;
      state.camera.position.y += deltaY;
      prevCameraTargetYRef.current = newTargetY;
      controlsRef.current.update();
    }

    // 4. Orientacja kątowa z interpolacją po najkrótszym łuku (brak obrotu przy 350° -> 0°)
    droneGroupRef.current.rotation.order = "YXZ";

    const targetPitch = THREE.MathUtils.degToRad(pitchDeg);
    const targetYaw = -THREE.MathUtils.degToRad(yawDeg);
    const targetRoll = -THREE.MathUtils.degToRad(rollDeg);

    droneGroupRef.current.rotation.x = lerpAngleRad(
      droneGroupRef.current.rotation.x,
      targetPitch,
      smoothing
    );
    droneGroupRef.current.rotation.y = lerpAngleRad(
      droneGroupRef.current.rotation.y,
      targetYaw,
      smoothing
    );
    droneGroupRef.current.rotation.z = lerpAngleRad(
      droneGroupRef.current.rotation.z,
      targetRoll,
      smoothing
    );

    // 5. Obrót śmigieł
    if (isArmed) {
      propRefs.current.forEach((prop, idx) => {
        if (prop) {
          const direction = idx % 2 === 0 ? 1 : -1;
          prop.rotation.y += delta * 38 * direction;
        }
      });
    }
  });

  // Ramiona w układzie X dopasowane do gabarytu 50 cm x 50 cm (0.50 m x 0.50 m)
  const armLength = 0.21;
  const armAngles = [
    { angle: Math.PI / 4, isFront: true },
    { angle: (3 * Math.PI) / 4, isFront: false },
    { angle: -(3 * Math.PI) / 4, isFront: false },
    { angle: -Math.PI / 4, isFront: true },
  ];

  // Znaczniki miarki wysokości w metrach (od 1 m do 35 m co 1 metr)
  const rulerTicks = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <>
      {/* Pionowa linia wysokości AGL od ziemi (0 m) do drona */}
      <mesh ref={altitudeStemRef} position={[0, GROUND_Y, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 1, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* Miarka metryczna 3D wzdłuż osi wznoszenia (podziałka co 1 m, szersza co 5 m) */}
      <group position={[-0.32, GROUND_Y, 0]}>
        {rulerTicks.map((meter) => {
          const isMajor = meter % 5 === 0;
          return (
            <group key={meter} position={[0, meter, 0]}>
              <mesh position={[isMajor ? 0.04 : 0.02, 0, 0]}>
                <boxGeometry
                  args={[isMajor ? 0.14 : 0.07, isMajor ? 0.01 : 0.005, 0.005]}
                />
                <meshBasicMaterial
                  color={isMajor ? "#38bdf8" : "#52525b"}
                  transparent
                  opacity={isMajor ? 0.9 : 0.5}
                />
              </mesh>
              {/* Pierścień pomocniczy co 5 metrów wysokości */}
              {isMajor && (
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0.32, 0, 0]}
                >
                  <ringGeometry args={[0.24, 0.25, 32]} />
                  <meshBasicMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.2}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Pierścień rzutowania 50 cm (promień 0.25 m) na płycie lądowiska (y = 0 m) */}
      <mesh
        ref={groundRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GROUND_Y + 0.003, 0]}
      >
        <ringGeometry args={[0.22, 0.25, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Model drona w skali rzeczywistej 1:1 (mieści się w sześcianie 0.5m x 0.5m x 0.5m) */}
      <group ref={droneGroupRef}>
        {showBoundingBox && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[DRONE_BOUNDS_M, DRONE_BOUNDS_M, DRONE_BOUNDS_M]} />
            <meshBasicMaterial
              color="#fbbf24"
              wireframe
              transparent
              opacity={0.35}
            />
          </mesh>
        )}

        {/* Korpus centralny (14 cm x 4 cm x 20 cm) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.04, 0.2]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Pakiet LiPo 4S (9 cm x 3.5 cm x 13 cm) */}
        <mesh position={[0, 0.035, 0.01]}>
          <boxGeometry args={[0.09, 0.035, 0.13]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.2} roughness={0.4} />
        </mesh>

        {/* Podwozie / płozy */}
        <mesh position={[0.06, -0.03, 0]}>
          <boxGeometry args={[0.01, 0.03, 0.16]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
        <mesh position={[-0.06, -0.03, 0]}>
          <boxGeometry args={[0.01, 0.03, 0.16]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>

        {/* Obiektyw kamery FPV z przodu (-Z) */}
        <mesh position={[0, 0.005, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.025, 20]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.6}
          />
        </mesh>

        {/* Strzałka kierunkowa przodu (-Z) */}
        <mesh position={[0, 0.005, -0.19]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.065, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* 4 Ramiona, silniki BLDC i śmigła (całkowita rozpiętość = 0.50 m = 50 cm) */}
        {armAngles.map((arm, idx) => {
          const x = Math.sin(arm.angle) * armLength;
          const z = -Math.cos(arm.angle) * armLength;
          const accentColor = arm.isFront ? "#38bdf8" : "#818cf8";

          return (
            <group key={idx}>
              <mesh
                position={[x / 2, -0.004, z / 2]}
                rotation={[0, -arm.angle, 0]}
              >
                <boxGeometry args={[0.022, 0.014, armLength]} />
                <meshStandardMaterial
                  color="#3f3f46"
                  metalness={0.5}
                  roughness={0.4}
                />
              </mesh>

              <mesh position={[x, 0.012, z]}>
                <cylinderGeometry args={[0.03, 0.03, 0.028, 24]} />
                <meshStandardMaterial
                  color="#18181b"
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>

              <mesh position={[x, -0.006, z]}>
                <cylinderGeometry args={[0.033, 0.033, 0.006, 24]} />
                <meshStandardMaterial
                  color={accentColor}
                  emissive={accentColor}
                  emissiveIntensity={0.85}
                />
              </mesh>

              <mesh
                ref={(el) => {
                  propRefs.current[idx] = el;
                }}
                position={[x, 0.03, z]}
              >
                <boxGeometry args={[0.2, 0.003, 0.02]} />
                <meshStandardMaterial
                  color={arm.isFront ? "#38bdf8" : "#a1a1aa"}
                  transparent
                  opacity={0.78}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </>
  );
}

interface DroneAttitude3DProps {
  compact?: boolean;
  overridePacket?: TelemetryPacket | null;
  maxAltitudeScale?: number;
}

export default function DroneAttitude3D({
  compact = false,
  overridePacket,
}: DroneAttitude3DProps) {
  const { getHistory, subscribeChart, displayTelemetry } = useTelemetry();
  const latestPacketRef = useRef<TelemetryPacket | null>(null);
  const [lockYaw, setLockYaw] = useState(false);
  const [enableAltitude3D, setEnableAltitude3D] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [cameraFollowDrone, setCameraFollowDrone] = useState(true);
  const controlsRef = useRef<any>(null);

  const isReplayMode = overridePacket !== undefined;

  useEffect(() => {
    if (isReplayMode) return;

    const history = getHistory();
    if (history.length > 0) {
      latestPacketRef.current = history[history.length - 1];
    }

    const unsubscribe = subscribeChart((updatedHistory) => {
      if (updatedHistory.length > 0) {
        latestPacketRef.current = updatedHistory[updatedHistory.length - 1];
      }
    });

    return () => unsubscribe();
  }, [isReplayMode, getHistory, subscribeChart]);

  useEffect(() => {
    if (isReplayMode) {
      latestPacketRef.current = overridePacket ?? null;
    }
  }, [isReplayMode, overridePacket]);

  const hudPacket = isReplayMode ? overridePacket : displayTelemetry;

  const toggleCameraMode = () => {
    setCameraFollowDrone((prev) => {
      const next = !prev;
      if (controlsRef.current) {
        const alt = latestPacketRef.current?.altitude ?? 0;
        const obj = controlsRef.current.object as THREE.Camera;
        if (!next) {
          // Widok całej kolumny wysokości z dystansu (widać ziemię i drona w skali 1:1)
          const dist = Math.max(4, alt * 1.35);
          obj.position.set(0, Math.max(1.5, alt * 0.5), dist);
        } else {
          // Zbliżenie na drona 50x50x50 cm
          obj.position.set(0, alt + 0.5, 1.15);
        }
        controlsRef.current.update();
      }
      return next;
    });
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      const alt = enableAltitude3D
        ? latestPacketRef.current?.altitude ?? 0
        : 0;
      const obj = controlsRef.current.object as THREE.Camera;
      controlsRef.current.target.set(0, alt + LANDING_GEAR_OFFSET_M, 0);
      obj.position.set(0, alt + 0.55, 1.15);
      setCameraFollowDrone(true);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col">
      {/* Pasek narzędziowy 3D */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-200">
            {isReplayMode
              ? "Rekonstrukcja 3D (Skala rzeczywista 1:1 — Dron 50 cm)"
              : "Wizualizacja 3D na żywo (Skala rzeczywista 1:1 — Dron 50 cm)"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleCameraMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              !cameraFollowDrone
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-zinc-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {cameraFollowDrone ? "Kamera: Śledź drona" : "Kamera: Cała kolumna"}
          </button>

          <button
            type="button"
            onClick={() => setShowBoundingBox((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showBoundingBox
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Obrys 50cm
          </button>

          <button
            type="button"
            onClick={() => setEnableAltitude3D((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              enableAltitude3D
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {enableAltitude3D ? "Wysokość 1:1: Wł." : "Wysokość 1:1: Wył."}
          </button>

          <button
            type="button"
            onClick={() => setLockYaw((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              lockYaw
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            {lockYaw ? "Yaw: Zablokowany" : "Yaw: Swobodny"}
          </button>

          <button
            type="button"
            onClick={resetCamera}
            title="Resetuj widok kamery"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Scena Three.js (1 jednostka = 1 metr, far = 200 m dla pełnego widoku wysokości) */}
      <div className={`relative w-full ${compact ? "h-64 sm:h-72" : "h-72 sm:h-96"}`}>
        <Canvas
          camera={{ position: [0, 0.55, 1.15], fov: 42, near: 0.05, far: 250 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#09090b"]} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[5, 30, 10]} intensity={1.2} />
          <directionalLight position={[-5, -10, -5]} intensity={0.3} />

          {/* Siatka lądowiska 10m x 10m (1 kratka = 25 cm, dron zajmuje 2x2 kratki = 50x50 cm) */}
          <gridHelper
            args={[10, 40, "#27272a", "#18181b"]}
            position={[0, GROUND_Y, 0]}
          />

          {/* Okrąg lądowiska o średnicy 1.0 m na poziomie ziemi (y = 0 m) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.001, 0]}>
            <ringGeometry args={[0.48, 0.5, 64]} />
            <meshBasicMaterial color="#3f3f46" side={THREE.DoubleSide} />
          </mesh>

          <QuadcopterModel
            targetTelemetry={latestPacketRef}
            lockYaw={lockYaw}
            enableAltitude3D={enableAltitude3D}
            showBoundingBox={showBoundingBox}
            cameraFollowDrone={cameraFollowDrone}
            controlsRef={controlsRef}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={0.45}
            maxDistance={60.0}
          />
        </Canvas>

        {/* Dolny pasek HUD */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-950/85 border border-zinc-800 backdrop-blur-sm text-xs tabular-nums">
            <span>
              <strong className="text-sky-400">Alt (1:1):</strong>{" "}
              {hudPacket
                ? `${hudPacket.altitude.toFixed(2)} m (${(
                    hudPacket.altitude / DRONE_BOUNDS_M
                  ).toFixed(1)}x dron)`
                : "--"}
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <strong className="text-indigo-400">Roll:</strong>{" "}
              {hudPacket ? `${hudPacket.roll.toFixed(1)}°` : "--"}
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <strong className="text-purple-400">Pitch:</strong>{" "}
              {hudPacket ? `${hudPacket.pitch.toFixed(1)}°` : "--"}
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <strong className="text-emerald-400">Yaw:</strong>{" "}
              {hudPacket ? `${hudPacket.yaw.toFixed(0)}°` : "--"}
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-950/85 border border-zinc-800 backdrop-blur-sm text-[11px] text-zinc-400">
            <span>Podziałka: co 1 m (pierścień co 5 m)</span>
            <span className="text-zinc-700">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Przód
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Tył
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
