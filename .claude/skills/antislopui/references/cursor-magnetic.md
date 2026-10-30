# Custom Cursor, Magnetic, and Pointer Effects

Signature interactions that make a site feel crafted. All grounded in real awwwards repos. Gate every pointer effect behind a fine-pointer check so touch devices are untouched.

```ts
const finePointer = window.matchMedia("(pointer: fine)").matches;
if (!finePointer) return; // skip cursor/magnetic on touch
```

## Custom cursor follower (verified, gsap.quickTo)

`gsap.quickTo` pre-creates a tween per axis. Each `mousemove` just calls it, which is the correct high-frequency pattern (do not create a tween per event). Hide the native cursor with `cursor: none`.

```tsx
"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const xTo = gsap.quickTo(dot.current, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(dot.current, "y", { duration: 0.5, ease: "power3" });
    const move = (e: MouseEvent) => { xTo(e.clientX); yTo(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[999] -ml-3 -mt-3 h-6 w-6 rounded-full bg-white mix-blend-difference" />;
}
```

Mount it outside any pinned/transformed wrapper (a transformed ancestor breaks `position: fixed`).

## Context-aware cursor states (verified)

Grow the cursor on interactive elements, shrink on leave. Elastic appear reads premium.

```js
// on entering a clickable element:
gsap.to(cursor, { scale: 3, duration: 1.2, ease: "elastic.out(1, 0.4)" });
// on leaving:
gsap.to(cursor, { scale: 1, duration: 0.4, ease: "power3.out" });
// a "view" bubble that pops in over media:
gsap.to(bubble, { opacity: 1, scale: 1, rotation: 0, duration: 1.7, ease: "elastic.out(1, 0.4)" });
```

Tag interactive targets with `data-cursor="view"` and read the attribute on `mouseenter` to switch label/size. Add a slight offset (for example `xTo(e.clientX + 13); yTo(e.clientY - 43)`) when the cursor is a labeled bubble so the text sits beside the pointer.

## Magnetic button (verified technique)

The element eases toward the cursor while hovered, then springs back on leave. Distance from element center, scaled down, drives the offset.

```tsx
"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

export default function Magnetic({ children, strength = 0.4 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current!;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, { scope: ref });
  return <div ref={ref} className="inline-block will-change-transform">{children}</div>;
}
```

For a declarative version that also handles the label moving independently, use ZProximity `preset="magnetic"` (see `zproximity.md`).

## Eye-follow (verified ochi pattern)

Two iris elements whose pupils always point at the cursor. Pure React state, no animation library. The `-180` offset makes the pupil face toward the cursor.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

export default function Eyes() {
  const [l, setL] = useState(0); const [r, setR] = useState(0);
  const left = useRef<HTMLDivElement>(null); const right = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const angle = (ref: React.RefObject<HTMLDivElement>, mx: number, my: number) => {
      const b = ref.current!.getBoundingClientRect();
      const dx = mx - (b.left + b.width / 2); const dy = my - (b.top + b.height / 2);
      return Math.atan2(dy, dx) * (180 / Math.PI) - 180;
    };
    const move = (e: MouseEvent) => { setL(angle(left, e.clientX, e.clientY)); setR(angle(right, e.clientX, e.clientY)); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  const Eye = ({ inner, rot }: { inner: React.RefObject<HTMLDivElement>; rot: number }) => (
    <div className="flex h-[15vw] w-[15vw] items-center justify-center rounded-full bg-white">
      <div ref={inner} className="relative h-2/3 w-2/3 rounded-full bg-zinc-900">
        <div className="absolute left-1/2 top-1/2 h-8 w-full" style={{ transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
          <div className="h-8 w-8 rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
  return <div className="flex gap-10"><Eye inner={left} rot={l} /><Eye inner={right} rot={r} /></div>;
}
```

## Sticker velocity-push (verified Truus pattern)

A nearby element is shoved in the direction of fast cursor movement, then springs back. Combines proximity falloff with pointer speed, so it only reacts to deliberate fast passes.

```js
const PROXIMITY_RADIUS = 180, STRENGTH = 4, MAX_PUSH = 55, MIN_SPEED = 3;
let prevX = 0, prevY = 0;
const onMove = (e) => {
  const dx = e.clientX - prevX, dy = e.clientY - prevY; prevX = e.clientX; prevY = e.clientY;
  const r = sticker.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
  const speed = Math.hypot(dx, dy);
  if (dist < PROXIMITY_RADIUS && speed > MIN_SPEED) {
    const falloff = 1 - dist / PROXIMITY_RADIUS;
    const pushX = gsap.utils.clamp(-MAX_PUSH, MAX_PUSH, dx * STRENGTH * falloff);
    const pushY = gsap.utils.clamp(-MAX_PUSH, MAX_PUSH, dy * STRENGTH * falloff);
    gsap.to(sticker, { x: pushX, y: pushY, rotation: pushX * 0.25, duration: 0.18, ease: "power3.out" });
    gsap.to(sticker, { x: 0, y: 0, rotation: 0, duration: 1.1, ease: "elastic.out(1, 0.35)", delay: 0.18 });
  }
};
```

## Mouse-follow image on list hover (verified)

A floating preview image follows the cursor over a list of links, with velocity-based tilt. Set `opacity` 0/1 on enter/leave; tilt from horizontal cursor delta.

```js
let lastX = 0;
el.addEventListener("mousemove", (e) => {
  const tilt = gsap.utils.clamp(-20, 20, (e.clientX - lastX) * 0.2); lastX = e.clientX;
  gsap.to(preview, { opacity: 1, top: e.clientY, left: e.clientX, rotate: tilt, ease: "power4.out", duration: 0.4 });
});
el.addEventListener("mouseleave", () => gsap.to(preview, { opacity: 0, duration: 0.5, ease: "power4.out" }));
```

## Mouse parallax layers (verified)

Depth without scroll: each tagged element moves a fraction of the cursor offset, scaled by a per-element depth value.

```js
section.addEventListener("mousemove", (e) => {
  layers.forEach((el) => {
    const depth = parseFloat(el.dataset.depth || "1");
    const x = (window.innerWidth - e.clientX * depth) / 50;
    const y = (window.innerHeight - e.clientY * depth) / 50;
    gsap.to(el, { x, y, duration: 0.6, ease: "power2.out" });
  });
});
```

## Rules

- One custom cursor per site, mounted at the root, fixed, `pointer-events-none`, `mix-blend-difference` for legibility on any background.
- Always provide the native cursor on touch (`(pointer: fine)` guard).
- Use `quickTo`/`quickSetter` for per-frame updates, never a fresh `gsap.to` per `mousemove`.
- Spring-back with `elastic.out(1, 0.3..0.4)`; snappy push-out with `power3.out`.
