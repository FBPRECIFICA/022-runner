# Page Transitions and Preloaders

The entrance and the between-pages moments. These frame the whole experience, so spend effort here. All grounded in real patterns.

## Preloader (counter + mask reveal)

A counter ticks 0 to 100 while panels hold, then the cover wipes away to reveal the hero. Lock scroll until done, then start the hero entrance.

```tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const id = setInterval(() => setCount((c) => (c >= 100 ? (clearInterval(id), 100) : c + 1)), 18);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (count < 100) return;
    const t = setTimeout(() => { setShow(false); document.body.style.overflow = ""; onDone(); }, 500);
    return () => clearTimeout(t);
  }, [count, onDone]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[1000] flex items-end justify-end bg-[#0a0a0a] p-8"
          exit={{ y: "-100%" }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}>
          <span className="text-[12vw] leading-none text-[#f4f1ea] tabular-nums">{count}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Variants worth using: a column of panels that exit with a stagger (`exit={{ scaleY: 0 }}` with `transformOrigin: top`), or a word that masks up out of view before the cover lifts (pair with SplitText).

## App Router route transitions (template.tsx)

In Next.js App Router, `template.tsx` remounts on every navigation, which makes it the right place for enter transitions. Combine with `AnimatePresence` keyed on the pathname for exit-then-enter.

```tsx
// app/template.tsx
"use client";
import { motion } from "motion/react";
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
```

For a full exit-then-enter wipe, render a fixed overlay in a layout-level client component keyed to `usePathname()` inside `AnimatePresence mode="wait"`, and animate the overlay in on route change. Always scroll to top during the covered moment:

```ts
window.__lenis?.scrollTo(0, { immediate: true }); // or window.scrollTo(0, 0)
```

## Curtain / panel wipe

A colored panel sweeps across, scrolls reset behind it, then it sweeps off. Cleanest as `clipPath` or `scaleY`.

```tsx
<motion.div className="fixed inset-0 z-[1000] bg-[#f4f1ea] origin-bottom"
  initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0] }}
  transition={{ duration: 1.1, times: [0, 0.4, 0.6, 1], ease: [0.76, 0, 0.24, 1] }} />
```

A column-of-panels variant divides the screen into 5 vertical strips that wipe with a per-strip delay for a blinds effect.

## SVG scribble transition (verified)

A hand-drawn scribble strokes across the screen to cover the page, then strokes off, with the scroll reset at the peak. Uses the path-draw technique.

```js
const path = scribbleEl; // an <svg><path>
const len = path.getTotalLength() + 5;
gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, strokeWidth: 2 });
const tl = gsap.timeline();
// draw in
tl.to(path, { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 0)
  .to(path, { strokeWidth: 600, duration: 0.7, ease: "power2.inOut" }, 0)   // thicken to cover screen
  .call(() => window.__lenis?.scrollTo(0, { immediate: true }), undefined, 0.7)
  // draw out
  .to(path, { strokeDashoffset: -len, duration: 0.7, ease: "power2.inOut" }, 0.7)
  .to(path, { strokeWidth: 2, duration: 0.7, ease: "power2.inOut" }, 0.7);
```

Randomize the stroke color per navigation from a small palette for personality.

## Generic path-draw reveal (verified)

Reusable for underlines, scribbles, hand-drawn arrows, signatures.

```js
const len = path.getTotalLength();
gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
gsap.to(path, { strokeDashoffset: 0, duration: 1.2, ease: "power3.out",
  scrollTrigger: { trigger: path, start: "top 80%", toggleActions: "play none none reverse" } });
```

Anime.js v4 has a built-in for this via `createDrawable` (see `anime.md`).

## Shared-element transition (layoutId)

A thumbnail morphs into a detail view, or a nav indicator slides between items. Give both the same `layoutId`.

```tsx
// in the grid
<motion.img layoutId={`work-${id}`} src={thumb} />
// in the opened detail (inside AnimatePresence)
<motion.img layoutId={`work-${id}`} src={full} />
```

Nav active-pill:

```tsx
{tabs.map((t) => (
  <button key={t} className="relative px-4 py-2">
    {t}
    {active === t && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-white/10" />}
  </button>
))}
```

## Section-to-section transition factory (verified)

Cross-fade adjacent sections as one scrolls into the next, useful for full-screen storytelling.

```js
function sectionAnim(stage, prev, next, nav) {
  return gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 90%", end: "top 0%", scrub: true } })
    .to(prev, { opacity: 0, y: "20%" }, "s")
    .from(next, { opacity: 0, y: "-20%" }, "s")
    .from(nav, { backgroundColor: "#fff" }, "s");
}
```

## Rules

- Keep total transition time under about 1.2s. Longer feels slow on repeat visits.
- Always reset scroll position during the covered frame.
- The first load gets the preloader; subsequent navigations get the lighter route transition. Do not replay the full preloader on every nav.
- Respect reduced motion: fall back to a quick opacity fade.
