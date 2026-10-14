import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Compass, RotateCcw, ArrowUpDown, Box } from "lucide-react";
import { useTelemetry } from "../context/TelemetryContext";
import type { TelemetryPacket } from "../../../shared/types";

// Poziom ziemi w metrach (1 jednostka = 1 metr)
const GROUND_Y = -0.35;
// Rozmiar gabarytowy drona: 0.50 m = 50 cm
const DRONE_BOUNDS_M = 0.5;

interface QuadcopterModelProps {
  targetTelemetry: React.MutableRefObject<TelemetryPacket | null>;
  lockYaw: boolean;
  enableAltitude3D: boolean;
  showBoundingBox: boolean;
  maxAltitudeScale: number;
}

function QuadcopterModel({
  targetTelemetry,
  lockYaw,
  enableAltitude3D,
  showBoundingBox,
  maxAltitudeScale,
}: QuadcopterModelProps) {
  const droneGroupRef = useRef<THREE.Group>(null);
  const propRefs = useRef<(THREE.Mesh | null)[]>([]);
  const altitudeStemRef = useRef<THREE.Mesh>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!droneGroupRef.current) return;

    const packet = targetTelemetry.current;
    const rollDeg = packet ? packet.roll : 0;
    const pitchDeg = packet ? packet.pitch : 0;
    const yawDeg = packet && !lockYaw ? packet.yaw : 0;
    const altitude = packet ? Math.max(0, packet.altitude) : 0;
    const isArmed = packet ? packet.isArmed : false;

    // Skalowana wysokość w oknie 3D (od poziomu płyty startowej do +0.65 m w kadrze)
    const normalizedAlt = Math.min(1, altitude / Math.max(1, maxAltitudeScale));
    const targetY = enableAltitude3D
      ? GROUND_Y + 0.04 + normalizedAlt * 0.65
      : 0;

    const smoothing = Math.min(1, delta * 12);

    droneGroupRef.current.position.y = THREE.MathUtils.lerp(
      droneGroupRef.current.position.y,
      targetY,
      smoothing
    );

    // Pionowa linia wysokości (Drop-line) i pierścień rzutowania (średnica 50 cm)
    const currentDroneY = droneGroupRef.current.position.y;
    const heightAboveGround = Math.max(0.005, currentDroneY - GROUND_Y);

    if (altitudeStemRef.current) {
      altitudeStemRef.current.position.y = GROUND_Y + heightAboveGround / 2;
      altitudeStemRef.current.scale.set(1, heightAboveGround, 1);
    }

    if (groundRingRef.current) {
      const ringScale = Math.max(0.4, 1 - normalizedAlt * 0.45);
      groundRingRef.current.scale.set(ringScale, ringScale, 1);
    }

    // Porządek rotacji lotniczej: Yaw (Y) -> Pitch (X) -> Roll (Z)
    droneGroupRef.current.rotation.order = "YXZ";

    const targetPitch = THREE.MathUtils.degToRad(pitchDeg);
    const targetYaw = -THREE.MathUtils.degToRad(yawDeg);
    const targetRoll = -THREE.MathUtils.degToRad(rollDeg);

    droneGroupRef.current.rotation.x = THREE.MathUtils.lerp(
      droneGroupRef.current.rotation.x,
      targetPitch,
      smoothing
    );
    droneGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      droneGroupRef.current.rotation.y,
      targetYaw,
      smoothing
    );
    droneGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      droneGroupRef.current.rotation.z,
      targetRoll,
      smoothing
    );

    if (isArmed) {
      propRefs.current.forEach((prop, idx) => {
        if (prop) {
          const direction = idx % 2 === 0 ? 1 : -1;
          prop.rotation.y += delta * 38 * direction;
        }
      });
    }
  });

  // Układ ramion X dopasowany do obrysu 50 cm x 50 cm (0.50 m x 0.50 m)
  // Odległość silnika od środka: 0.21 m -> rozstaw osi silników X/Z ~ 0.30 m + śmigło 0.20 m = 0.50 m całkowitej szerokości
  const armLength = 0.21;
  const armAngles = [
    { angle: Math.PI / 4, isFront: true },
    { angle: (3 * Math.PI) / 4, isFront: false },
    { angle: -(3 * Math.PI) / 4, isFront: false },
    { angle: -Math.PI / 4, isFront: true },
  ];

  return (
    <>
      {/* Słupek wysokości AGL */}
      <mesh ref={altitudeStemRef} position={[0, GROUND_Y, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 1, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
      </mesh>

      {/* Pierścień rzutowania 50 cm (promień 0.25 m) na siatce lądowiska */}
      <mesh
        ref={groundRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GROUND_Y + 0.002, 0]}
      >
        <ringGeometry args={[0.22, 0.25, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grupa drona (wymiary rzeczywiste w metrach, mieści się w 0.5m x 0.5m x 0.5m) */}
      <group ref={droneGroupRef}>
        {/* Siatka pomocnicza sześcianu 50 cm x 50 cm x 50 cm */}
        {showBoundingBox && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[DRONE_BOUNDS_M, DRONE_BOUNDS_M, DRONE_BOUNDS_M]} />
            <meshBasicMaterial
              color="#38bdf8"
              wireframe
              transparent
              opacity={0.25}
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

        {/* Podwozie / płozy (wysokość 4 cm) */}
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

        {/* 4 Ramiona, silniki BLDC i śmigła 8-calowe (20 cm) */}
        {armAngles.map((arm, idx) => {
          const x = Math.sin(arm.angle) * armLength;
          const z = -Math.cos(arm.angle) * armLength;
          const accentColor = arm.isFront ? "#38bdf8" : "#818cf8";

          return (
            <group key={idx}>
              {/* Ramię karbonowe */}
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

              {/* Silnik BLDC */}
              <mesh position={[x, 0.012, z]}>
                <cylinderGeometry args={[0.03, 0.03, 0.028, 24]} />
                <meshStandardMaterial
                  color="#18181b"
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>

              {/* Pierścień LED pod silnikiem */}
              <mesh position={[x, -0.006, z]}>
                <cylinderGeometry args={[0.033, 0.033, 0.006, 24]} />
                <meshStandardMaterial
                  color={accentColor}
                  emissive={accentColor}
                  emissiveIntensity={0.85}
                />
              </mesh>

              {/* Śmigło (średnica 0.20 m = 20 cm -> całkowity obrys drona = 50 cm) */}
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
  maxAltitudeScale = 15,
}: DroneAttitude3DProps) {
  const { getHistory, subscribeChart, displayTelemetry } = useTelemetry();
  const latestPacketRef = useRef<TelemetryPacket | null>(null);
  const [lockYaw, setLockYaw] = useState(false);
  const [enableAltitude3D, setEnableAltitude3D] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
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

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
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
              ? "Rekonstrukcja 3D lotu (Skala 1:1 — 50x50x50 cm)"
              : "Wizualizacja 3D na żywo (Skala 1:1 — 50x50x50 cm)"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            {enableAltitude3D ? "Wysokość: Wł." : "Wysokość: Wył."}
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
            <span className="hidden sm:inline">Kamera</span>
          </button>
        </div>
      </div>

      {/* Scena Three.js (Kamera dopasowana do modelu 0.5 m) */}
      <div className={`relative w-full ${compact ? "h-64 sm:h-72" : "h-72 sm:h-96"}`}>
        <Canvas
          camera={{ position: [0, 0.65, 1.15], fov: 42 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#09090b"]} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, -2, -2]} intensity={0.3} />

          {/* Siatka metryczna 4m x 4m (1 kratka = 25 cm, dron zajmuje 2x2 kratki = 50x50 cm) */}
          <gridHelper
            args={[4, 16, "#27272a", "#18181b"]}
            position={[0, GROUND_Y, 0]}
          />

          {/* Zewnętrzny okrąg strefy lądowiska (średnica 1 m) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.001, 0]}>
            <ringGeometry args={[0.48, 0.5, 64]} />
            <meshBasicMaterial color="#3f3f46" side={THREE.DoubleSide} />
          </mesh>

          <QuadcopterModel
            targetTelemetry={latestPacketRef}
            lockYaw={lockYaw}
            enableAltitude3D={enableAltitude3D}
            showBoundingBox={showBoundingBox}
            maxAltitudeScale={maxAltitudeScale}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={0.55}
            maxDistance={3.0}
          />
        </Canvas>

        {/* Dolny pasek HUD */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-950/85 border border-zinc-800 backdrop-blur-sm text-xs tabular-nums">
            <span>
              <strong className="text-sky-400">Alt:</strong>{" "}
              {hudPacket ? `${hudPacket.altitude.toFixed(2)} m` : "--"}
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
            <span>Kratka siatki: 25 cm</span>
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
