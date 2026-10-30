# Setup: Next.js + Tailwind + Smooth Scroll Foundation

The foundation every AntiSlopUI build starts from. Set this up first, once, then layer effects on top.

## Install

```bash
npx create-next-app@latest my-site   # App Router, TypeScript, Tailwind: yes
cd my-site
npm install gsap @gsap/react lenis motion
# optional add-ons, install only when used:
# npm install animejs
# npm install z-proximity-engine
```

Package notes (verified):
- `gsap` ships ScrollTrigger, SplitText, ScrollSmoother, Flip, MorphSVG. All free since the 2025 release. Import each plugin from its path and register it.
- `@gsap/react` provides the `useGSAP()` hook (SSR-safe, auto-cleanup).
- `lenis` is the smooth-scroll engine. React entry is `lenis/react`. CSS import `lenis/dist/lenis.css` is required.
- `motion` is Motion for React (formerly framer-motion). Import from `"motion/react"`. Do not install or import `framer-motion`.

## Register GSAP plugins (client only)

GSAP and its plugins touch `window`, so they live in client components. Register once per module that uses them.

```tsx
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
```

`registerPlugin` is mandatory before plugin use and also protects plugins from being tree-shaken out of the bundle.

## The SmoothScrollProvider (canonical)

This is the heart of the foundation. It runs Lenis and feeds its position into the GSAP ticker so ScrollTrigger and Lenis share one clock. The `time * 1000` conversion is required: GSAP ticker time is in seconds, Lenis `raf` expects milliseconds.

```tsx
// components/SmoothScrollProvider.tsx
"use client";
import { ReactLenis } from "lenis/react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000); // seconds -> ms
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
```

Wire it into the root layout:

```tsx
// app/layout.tsx
import SmoothScrollProvider from "@/components/SmoothScrollProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
```

Vanilla (non-React) equivalent, for plain GSAP projects, verified canonical form:

```js
import Lenis from "lenis";
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Pure-Motion projects (no GSAP) can use `<ReactLenis root>` with default `autoRaf` and read scroll with Motion's `useScroll`. The line-awwwards-SOTM repo wraps `<body>` in `<ReactLenis root>` directly in `app/layout.tsx`.

## Fonts

Use `next/font` for zero-layout-shift custom fonts. Awwwards type leans on a grotesk display face plus a contrast serif. Variable fonts unlock the `weight` proximity effect.

```tsx
// app/layout.tsx
import localFont from "next/font/local";
const grotesk = localFont({
  src: "../public/fonts/PPNeueMontreal-Variable.woff2",
  variable: "--font-grotesk",
  display: "swap",
});
// apply className={grotesk.variable} on <html>, reference via font-[family-name:var(--font-grotesk)]
```

## Reduced-motion guard

Respect the OS setting. Two layers: a hook for React, and GSAP `matchMedia` for scroll work.

```tsx
// hooks/useReducedMotion.ts
"use client";
import { useEffect, useState } from "react";
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
```

```tsx
// inside useGSAP, branch on reduced motion with GSAP matchMedia:
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add(
    { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
    (ctx) => {
      const { ok } = ctx.conditions as { ok: boolean };
      if (!ok) { gsap.set(".reveal", { opacity: 1, y: 0 }); return; }
      gsap.from(".reveal", { opacity: 0, y: 60, stagger: 0.1, scrollTrigger: { trigger: ".reveal", start: "top 80%" } });
    }
  );
}, { scope: container });
```

## useGSAP cleanup model

`useGSAP` reverts every GSAP animation and ScrollTrigger created inside it on unmount, scoped to a ref. Use `contextSafe` for animations created in event handlers.

```tsx
const container = useRef<HTMLDivElement>(null);
const { contextSafe } = useGSAP({ scope: container });
const onClick = contextSafe(() => gsap.to(".box", { rotation: 180 }));
// dependencies: useGSAP(fn, { scope: container, dependencies: [x], revertOnUpdate: true })
```

## Project conventions for AntiSlopUI

- One `SmoothScrollProvider` at the root. Never create multiple Lenis instances.
- Section components live in `app/sections/` or `components/sections/`, each `"use client"` if animated.
- Keep `position: fixed` elements (custom cursor, nav, preloader) outside any pinned/transformed wrapper so transforms do not break them.
- After dynamic content loads (images, fonts, route change) call `ScrollTrigger.refresh()` so trigger positions recompute.
