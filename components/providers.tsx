"use client";

import { ThemeProvider } from "next-themes";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Lenis gives the weighted, premium scroll feel — but reduced-motion users get
 * native scroll, always. This is not optional polish; hijacked scroll is a real
 * accessibility problem for people with vestibular disorders.
 */
function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render children plainly until we know the user's motion preference, so we
  // never briefly hijack scroll for someone who asked us not to.
  if (!mounted || reduce) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{ lerp: 0.11, duration: 1.1, smoothWheel: true, wheelMultiplier: 1 }}
    >
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SmoothScroll>{children}</SmoothScroll>
    </ThemeProvider>
  );
}
