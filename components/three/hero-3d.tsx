"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

const SolarScene = dynamic(() => import("./solar-scene"), {
  ssr: false,
  loading: () => <StaticSolarFallback />,
});

/**
 * The no-WebGL / reduced-motion / low-end-device path.
 *
 * Progressive enhancement is mandatory for 3D: this fallback is a designed CSS
 * composition of the same idea (a sun over a tilted panel grid), not an empty box.
 */
export function StaticSolarFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute right-[12%] top-[14%] h-40 w-40 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.85) 0%, hsl(var(--primary) / 0.25) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[16%] top-[18%] h-20 w-20 rounded-full"
        style={{ background: "hsl(var(--primary))", boxShadow: "0 0 80px 20px hsl(var(--primary) / 0.4)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 grid-lines opacity-40"
        style={{
          transform: "perspective(700px) rotateX(62deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black 10%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 85%)",
        }}
      />
    </div>
  );
}

/**
 * Renders the WebGL scene only when the device can genuinely handle it, and never
 * when the user has asked for reduced motion.
 */
export function Hero3D() {
  const reduce = useReducedMotion();
  const [capable, setCapable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      const lowCores = (navigator.hardwareConcurrency ?? 4) <= 2;
      const narrow = window.matchMedia("(max-width: 640px)").matches;
      const lowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      setCapable(!!gl && !lowCores && !narrow && (lowMemory === undefined || lowMemory > 2));
    } catch {
      setCapable(false);
    }
  }, []);

  if (capable === null || reduce || capable === false) {
    return <StaticSolarFallback />;
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <SolarScene />
    </div>
  );
}
