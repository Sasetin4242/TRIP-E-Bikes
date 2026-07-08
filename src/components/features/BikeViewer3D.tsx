import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { X, Zap, Battery, Settings, ChevronRight } from "lucide-react";

interface HotspotInfo {
  id: string;
  label: string;
  description: string;
  specs: string[];
  color: string;
  icon: React.ElementType;
  position: [number, number, number];
}

const HOTSPOTS: HotspotInfo[] = [
  {
    id: "motor",
    label: "750W Motor",
    description: "High-torque rear hub motor engineered for Philippine terrain",
    specs: ["750W Peak Power", "Rated Torque: 80Nm", "Max Efficiency: 92%", "IP65 Waterproof"],
    color: "#39FF14",
    icon: Zap,
    position: [-1.4, -0.1, 0],
  },
  {
    id: "battery",
    label: "48V Battery",
    description: "Premium lithium-ion cell pack with smart BMS protection",
    specs: ["48V 11.6Ah", "Range: 50–120km", "Charge Time: 5–6hrs", "1000+ Cycle Life"],
    color: "#00FFFF",
    icon: Battery,
    position: [0, 0.3, 0],
  },
  {
    id: "suspension",
    label: "Suspension Fork",
    description: "Full front suspension for rough Philippine roads and trails",
    specs: ["80mm Travel", "Coil Spring", "Preload Adjustable", "Oil Damping"],
    color: "#A8FF3E",
    icon: Settings,
    position: [1.4, 0.3, 0],
  },
];

// E-Bike 3D Model made from geometric primitives
function EBikeModel({ activeHotspot }: { activeHotspot: string | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelMat = new THREE.MeshStandardMaterial({ color: "#1A1A1A", metalness: 0.9, roughness: 0.3 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#00FFFF", metalness: 1, roughness: 0.1, emissive: new THREE.Color("#00FFFF"), emissiveIntensity: 0.3 });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#39FF14", metalness: 0.8, roughness: 0.2, emissive: new THREE.Color("#39FF14"), emissiveIntensity: 0.2 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#1F1F1F", metalness: 0.7, roughness: 0.4 });
  const motorMat = new THREE.MeshStandardMaterial({
    color: activeHotspot === "motor" ? "#39FF14" : "#2A2A2A",
    metalness: 0.9,
    roughness: 0.1,
    emissive: new THREE.Color(activeHotspot === "motor" ? "#39FF14" : "#000000"),
    emissiveIntensity: activeHotspot === "motor" ? 0.5 : 0,
  });
  const batteryMat = new THREE.MeshStandardMaterial({
    color: activeHotspot === "battery" ? "#00FFFF" : "#252525",
    metalness: 0.8,
    roughness: 0.2,
    emissive: new THREE.Color(activeHotspot === "battery" ? "#00FFFF" : "#000000"),
    emissiveIntensity: activeHotspot === "battery" ? 0.4 : 0,
  });

  // Gentle auto-rotation when no interaction
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  // Wheel geometry
  const WheelGroup = ({ x }: { x: number }) => (
    <group position={[x, -0.5, 0]}>
      {/* Tire */}
      <mesh material={wheelMat}>
        <torusGeometry args={[0.55, 0.12, 16, 32]} />
      </mesh>
      {/* Rim */}
      <mesh material={rimMat}>
        <torusGeometry args={[0.55, 0.03, 8, 32]} />
      </mesh>
      {/* Spokes */}
      {[0, 45, 90, 135].map((angle) => (
        <mesh key={angle} material={rimMat} rotation={[0, 0, (angle * Math.PI) / 180]}>
          <cylinderGeometry args={[0.01, 0.01, 1.1, 4]} />
        </mesh>
      ))}
      {/* Hub */}
      <mesh material={x < 0 ? motorMat : bodyMat} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 16]} />
      </mesh>
    </group>
  );

  return (
    <group ref={groupRef}>
      {/* Wheels */}
      <WheelGroup x={-1.4} />
      <WheelGroup x={1.4} />

      {/* Main frame - down tube */}
      <mesh material={frameMat} position={[-0.2, -0.1, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.045, 0.045, 1.4, 8]} />
      </mesh>
      {/* Seat tube */}
      <mesh material={frameMat} position={[0.1, 0.1, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
      </mesh>
      {/* Top tube */}
      <mesh material={frameMat} position={[0.4, 0.6, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.035, 0.035, 1.0, 8]} />
      </mesh>
      {/* Chain stay */}
      <mesh material={bodyMat} position={[-0.65, -0.5, 0]} rotation={[0, 0, 0.0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
      </mesh>
      {/* Seat stay */}
      <mesh material={bodyMat} position={[-0.6, 0.0, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
      </mesh>

      {/* Battery pack */}
      <mesh material={batteryMat} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.6, 0.25, 0.12]} />
      </mesh>
      {/* Battery indicator lights */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={new THREE.MeshStandardMaterial({ color: "#39FF14", emissive: new THREE.Color("#39FF14"), emissiveIntensity: 0.8 })} position={[-0.15 + i * 0.15, 0.2, 0.07]}>
          <boxGeometry args={[0.08, 0.06, 0.01]} />
        </mesh>
      ))}

      {/* Fork */}
      <mesh material={bodyMat} position={[1.05, 0.0, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
      </mesh>
      {/* Fork lower left */}
      <mesh material={bodyMat} position={[1.2, -0.25, 0.07]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
      </mesh>
      {/* Fork lower right */}
      <mesh material={bodyMat} position={[1.2, -0.25, -0.07]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
      </mesh>

      {/* Handlebar stem */}
      <mesh material={bodyMat} position={[1.1, 0.6, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
      </mesh>
      {/* Handlebar */}
      <mesh material={bodyMat} position={[1.1, 0.77, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
      </mesh>

      {/* Seat post */}
      <mesh material={bodyMat} position={[0.1, 0.75, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
      </mesh>
      {/* Seat */}
      <mesh material={new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.8 })} position={[0.07, 0.97, 0]}>
        <boxGeometry args={[0.45, 0.06, 0.18]} />
      </mesh>

      {/* Headlight */}
      <mesh material={new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: 0.6 })} position={[1.35, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
      </mesh>

      {/* LCD Display */}
      <mesh material={new THREE.MeshStandardMaterial({ color: "#001F00", emissive: new THREE.Color("#00FF88"), emissiveIntensity: 0.3 })} position={[0.9, 0.72, 0]}>
        <boxGeometry args={[0.14, 0.09, 0.02]} />
      </mesh>

      {/* Pedal crank area */}
      <mesh material={bodyMat} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
      </mesh>
      {/* Chain ring */}
      <mesh material={new THREE.MeshStandardMaterial({ color: "#39FF14", metalness: 1, roughness: 0.1 })} position={[0, -0.5, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.015, 8, 24]} />
      </mesh>
    </group>
  );
}

function HotspotMarker({ hotspot, active, onClick }: { hotspot: HotspotInfo; active: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.scale.setScalar(active ? 1.3 + Math.sin(state.clock.elapsedTime * 3) * 0.1 : 1);
    }
  });

  return (
    <group position={hotspot.position}>
      <mesh ref={ref} onClick={onClick}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={hotspot.color}
          emissive={new THREE.Color(hotspot.color)}
          emissiveIntensity={active ? 1.0 : 0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Outer ring */}
      <mesh>
        <torusGeometry args={[0.12, 0.015, 8, 32]} />
        <meshStandardMaterial
          color={hotspot.color}
          emissive={new THREE.Color(hotspot.color)}
          emissiveIntensity={active ? 0.8 : 0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Label */}
      <Html distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div
          className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            active ? "opacity-0" : "opacity-100"
          }`}
          style={{
            background: "rgba(10,10,10,0.9)",
            color: hotspot.color,
            border: `1px solid ${hotspot.color}40`,
            backdropFilter: "blur(8px)",
          }}
        >
          {hotspot.label}
        </div>
      </Html>
    </group>
  );
}

function Scene({ activeHotspot, setActiveHotspot }: { activeHotspot: string | null; setActiveHotspot: (id: string | null) => void }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFFFFF" castShadow />
      <pointLight position={[-3, 2, 2]} intensity={1} color="#39FF14" />
      <pointLight position={[3, -1, -2]} intensity={0.8} color="#00FFFF" />
      <pointLight position={[0, -3, 0]} intensity={0.4} color="#39FF14" />

      {/* Bike model */}
      <EBikeModel activeHotspot={activeHotspot} />

      {/* Hotspot markers */}
      {HOTSPOTS.map((h) => (
        <HotspotMarker
          key={h.id}
          hotspot={h}
          active={activeHotspot === h.id}
          onClick={() => setActiveHotspot(activeHotspot === h.id ? null : h.id)}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={7}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI * 0.75}
        autoRotate={false}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}

export default function BikeViewer3D() {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const activeInfo = HOTSPOTS.find((h) => h.id === activeHotspot);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080808]" style={{ height: "460px" }}>
      {/* Canvas */}
      <Canvas
        camera={{ position: [0, 0.5, 4.5], fov: 55 }}
        shadows
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene activeHotspot={activeHotspot} setActiveHotspot={setActiveHotspot} />
        </Suspense>
      </Canvas>

      {/* Background gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(8,8,8,0.6) 100%)",
        }}
      />

      {/* Hotspot Info Panel */}
      {activeInfo && (
        <div className="absolute bottom-4 left-4 right-4 glass rounded-xl border border-white/10 p-4 backdrop-blur-xl animate-fade-up pointer-events-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${activeInfo.color}20`, border: `1px solid ${activeInfo.color}40` }}>
                <activeInfo.icon className="w-4 h-4" style={{ color: activeInfo.color }} />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{activeInfo.label}</p>
                <p className="text-xs text-gray-500">{activeInfo.description}</p>
              </div>
            </div>
            <button onClick={() => setActiveHotspot(null)} className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {activeInfo.specs.map((spec) => (
              <div key={spec} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 shrink-0" style={{ color: activeInfo.color }} />
                <p className="text-xs text-gray-300">{spec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!activeHotspot && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Drag to rotate · Scroll to zoom · Click dots</p>
        </div>
      )}

      {/* Hotspot buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {HOTSPOTS.map((h) => {
          const Icon = h.icon;
          return (
            <button
              key={h.id}
              onClick={() => setActiveHotspot(activeHotspot === h.id ? null : h.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                activeHotspot === h.id ? "text-[#0A0A0A] border-transparent" : "bg-black/60 border-white/10 hover:border-white/30"
              }`}
              style={activeHotspot === h.id ? { background: h.color, borderColor: h.color } : { color: h.color }}
            >
              <Icon className="w-3 h-3" />
              {h.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
