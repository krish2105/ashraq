"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";
import type { MonteCarloResult } from "@/lib/finance-engine";

/**
 * The NPV distribution as a 3D ridge.
 *
 * The extra dimension is doing real work here rather than decorating: bars are
 * coloured by sign, so the volume of amber on the right versus red on the left is a
 * direct read of P(NPV > 0), and the ridge's depth makes the tails legible where a
 * flat histogram compresses them into invisibility.
 */

function Bars({
  histogram,
  isDark,
}: {
  histogram: MonteCarloResult["histogram"];
  isDark: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const maxCount = useMemo(
    () => Math.max(...histogram.map((h) => h.count), 1),
    [histogram]
  );

  useFrame((state) => {
    if (!group.current) return;
    // A slow idle orbit so the shape reads as three-dimensional without the user
    // having to drag it.
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.28;
  });

  const width = 0.14;
  const span = histogram.length * width;

  return (
    <group ref={group}>
      {histogram.map((bin, i) => {
        const height = (bin.count / maxCount) * 2.6 + 0.02;
        const x = i * width - span / 2;
        const positive = bin.midpoint > 0;
        const color = positive
          ? isDark
            ? "#f5b942"
            : "#d68a1e"
          : isDark
            ? "#e06c6c"
            : "#c23b3b";

        return (
          <mesh key={i} position={[x, height / 2, 0]}>
            <boxGeometry args={[width * 0.78, height, 0.42]} />
            <meshStandardMaterial
              color={color}
              metalness={0.35}
              roughness={0.42}
              emissive={color}
              emissiveIntensity={isDark ? 0.16 : 0.05}
            />
          </mesh>
        );
      })}

      {/* Zero line — the decision boundary */}
      {(() => {
        const zeroIndex = histogram.findIndex((h) => h.binEnd > 0);
        if (zeroIndex < 0) return null;
        const x = zeroIndex * width - span / 2;
        return (
          <mesh position={[x, 1.4, 0]}>
            <boxGeometry args={[0.022, 2.9, 0.6]} />
            <meshBasicMaterial color={isDark ? "#94a3b8" : "#475569"} />
          </mesh>
        );
      })()}

      {/* Base plate */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span + 0.6, 1.4]} />
        <meshStandardMaterial
          color={isDark ? "#1e2433" : "#eceae4"}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

export default function McDistribution3D({ result }: { result: MonteCarloResult }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <Canvas
      camera={{ position: [0, 2.4, 5.4], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={isDark ? 0.5 : 0.95} />
      <directionalLight position={[3, 5, 4]} intensity={isDark ? 1.1 : 1.5} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#8ab4f8" />
      <Bars histogram={result.histogram} isDark={isDark} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
