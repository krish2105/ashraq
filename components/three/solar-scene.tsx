"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, Instances, Instance } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";

/**
 * A 1.2 MWp rooftop array, abstracted.
 *
 * The 3D earns its place here by being the subject rather than decoration: this is
 * literally the asset being appraised. Panels tilt toward a sun that tracks the
 * pointer, so the scene reads as "irradiance falling on an array" — the physical
 * mechanism behind every number in the model.
 */

const ROWS = 6;
const COLS = 9;

function PanelField({ tint }: { tint: string }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const positions = useMemo(() => {
    const out: { pos: [number, number, number]; phase: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        out.push({
          pos: [(c - (COLS - 1) / 2) * 1.15, 0, (r - (ROWS - 1) / 2) * 1.45],
          phase: (r * COLS + c) * 0.28,
        });
      }
    }
    return out;
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Gentle pointer-driven tilt — lerped so it eases rather than snaps.
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      pointer.x * 0.12,
      0.04
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -0.62 + pointer.y * 0.07,
      0.04
    );
    group.current.position.y = Math.sin(t * 0.4) * 0.08;
  });

  return (
    <group ref={group} rotation={[-0.62, 0, 0]}>
      <Instances limit={ROWS * COLS} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 0.045, 1.15]} />
        {/* Low metalness / higher roughness so these read as dark photovoltaic glass
            rather than mirrors — mirrored panels blew out the headline's contrast. */}
        <meshStandardMaterial
          color={tint}
          metalness={0.35}
          roughness={0.52}
          envMapIntensity={0.45}
        />
        {positions.map((p, i) => (
          <PanelInstance key={i} position={p.pos} phase={p.phase} />
        ))}
      </Instances>
    </group>
  );
}

function PanelInstance({
  position,
  phase,
}: {
  position: [number, number, number];
  phase: number;
}) {
  const ref = useRef<THREE.Object3D>(null);
  useFrame((state) => {
    if (!ref.current) return;
    // A slow ripple across the array — reads as sunlight sweeping the roof.
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.9 + phase) * 0.055;
  });
  return <Instance ref={ref} position={position} />;
}

function Sun({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const { pointer } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const targetX = 3.4 + pointer.x * 1.2;
    const targetY = 1.9 + pointer.y * 0.7;
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 0.03);
      ref.current.position.y = THREE.MathUtils.lerp(
        ref.current.position.y,
        targetY + Math.sin(t * 0.5) * 0.15,
        0.03
      );
      const pulse = 1 + Math.sin(t * 1.4) * 0.035;
      ref.current.scale.setScalar(pulse);
    }
    if (light.current && ref.current) {
      light.current.position.copy(ref.current.position);
    }
  });

  return (
    <>
      <Float speed={1.4} floatIntensity={0.5} rotationIntensity={0}>
        <mesh ref={ref} position={[3.4, 1.9, -5]}>
          <sphereGeometry args={[0.34, 32, 32]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </Float>
      <pointLight ref={light} color={color} intensity={26} distance={20} decay={2} />
    </>
  );
}

function Scene({ isDark }: { isDark: boolean }) {
  const panelTint = isDark ? "#141c2b" : "#1f2c40";
  const sunColor = isDark ? "#f5b942" : "#e08c1e";

  return (
    <>
      <ambientLight intensity={isDark ? 0.32 : 0.55} />
      <directionalLight position={[-4, 6, 4]} intensity={isDark ? 0.6 : 0.85} color="#fff4e0" />
      <Sun color={sunColor} />
      <PanelField tint={panelTint} />
      <Environment preset={isDark ? "night" : "dawn"} />
      <fog attach="fog" args={[isDark ? "#171b26" : "#faf7f2", 8, 19]} />
    </>
  );
}

export default function SolarScene() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <Canvas
      camera={{ position: [0.6, 3.4, 8.2], fov: 40 }}
      dpr={[1, 1.75]} // capped — the single biggest 3D perf lever
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <Scene isDark={isDark} />
      </Suspense>
    </Canvas>
  );
}
