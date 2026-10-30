# Text Effects

Type is the hero. These are the reveals and treatments that read as studio work. Prefer mask-clipped line reveals over generic fades.

## GSAP SplitText (verified, free since 2025)

```tsx
"use client";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);
```

Modern `onSplit` + `autoSplit` + `mask` is the correct line-reveal pattern. `mask: "lines"` adds an overflow-clip wrapper so lines rise from behind a mask. `autoSplit` re-splits on font load and resize. Returning the tween from `onSplit` lets GSAP manage cleanup and timing.

```tsx
useGSAP(() => {
  SplitText.create(".headline", {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 100, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ".headline", start: "top 80%" },
      });
    },
  });
}, { scope: container });
```

Char reveal (verified hero pattern): `expo.out`, 1.8s, 0.05 stagger, rising from 100%.

```tsx
const split = SplitText.create(".hero-title", { type: "chars words" });
gsap.from(split.chars, { yPercent: 100, duration: 1.8, ease: "expo.out", stagger: 0.05 });
```

Config worth knowing: `type` (`"chars words lines"` in any combination), `tag`, `mask`, `autoSplit`, `linesClass: "line++"` (auto-increment), `aria: "auto"` (keeps text readable to screen readers). CSS to avoid reflow jank: `font-kerning: none;` and avoid `text-wrap: balance` on split targets.

## Manual split fallback (no SplitText)

When not using GSAP, split in the DOM. Note: `split('')` breaks emoji/grapheme clusters; use `Intl.Segmenter` for production text.

```tsx
{[..."We create eye-opening work"].map((ch, i) => (
  <span key={i} className="inline-block" style={{ whiteSpace: ch === " " ? "pre" : "normal" }}>{ch}</span>
))}
```

Char opacity scrub on scroll (verified, manual split): set each char to low opacity, scrub to full as the paragraph passes.

```js
gsap.set(".para span", { opacity: 0.12 });
gsap.to(".para span", {
  opacity: 1, stagger: 0.03,
  scrollTrigger: { trigger: ".para", start: "top 70%", end: "bottom 90%", scrub: 1 },
});
```

## Per-character hover reveal (Motion, verified ochi pattern)

Large label slides up character by character on card hover. Parent must be `overflow-hidden`. Drive with `useAnimation()`.

```tsx
"use client";
import { motion, useAnimation } from "motion/react";
const controls = useAnimation();
// onMouseEnter: controls.start({ y: "0%" })
// onMouseLeave: controls.start({ y: "100%" })

<h2 className="overflow-hidden">
  {[..."salience labs"].map((ch, i) => (
    <motion.span
      key={i} className="inline-block"
      initial={{ y: "100%" }} animate={controls}
      transition={{ ease: [0.64, 0, 0.78, 0], delay: i * 0.01 }}
    >
      {ch === " " ? "\u00A0" : ch}
    </motion.span>
  ))}
</h2>
```

## Word reveal with variants (Motion)

```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const word = { hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };

<motion.h1 variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="leading-[0.95]">
  {"Design that moves".split(" ").map((w, i) => (
    <span key={i} className="inline-block overflow-hidden"><motion.span variants={word} className="inline-block">{w}&nbsp;</motion.span></span>
  ))}
</motion.h1>
```

## Scramble / cipher decode

Replace characters with random glyphs, then resolve. Pure JS, framework-agnostic. Trigger on hover or in-view.

```tsx
function scramble(el: HTMLElement, finalText: string, glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@") {
  let frame = 0; const total = finalText.length * 3;
  const id = setInterval(() => {
    const revealed = Math.floor(frame / 3);
    el.textContent = finalText.split("").map((c, i) =>
      i < revealed || c === " " ? c : glyphs[Math.floor(Math.random() * glyphs.length)]
    ).join("");
    if (frame++ >= total) { el.textContent = finalText; clearInterval(id); }
  }, 30);
}
```

For a proximity-driven cipher (decodes as the cursor nears each letter), use ZProximity `preset="cipher"` (see `zproximity.md`). Anime.js v4 also ships `scrambleText` as a tween property.

## Gradient text treatments (CSS, no framework)

All use `background-clip: text` with `color: transparent` and an animated gradient position. Aurora, shiny, and animated-gradient are the same technique with different gradients/speeds.

```css
.aurora-text {
  background: linear-gradient(90deg, #7c5cff, #ff5c8a, #ffd25c, #7c5cff);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: aurora 6s linear infinite;
}
@keyframes aurora { to { background-position: 200% center; } }
```

Shiny sweep: `linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)` with `background-size: 200%` animating `background-position` once on hover.

## Sweep reveal (gradient band wipes text in)

A colored band sweeps across `background-clip: text` to reveal a headline; supports cycling phrases. Animate `background-position` from off-left to off-right with Motion or GSAP.

## Morphing text (blur cross-fade)

Two overlapping spans cross-fade with `filter: blur()`: outgoing word blurs up and fades, incoming blurs down into focus, offset in time to create a liquid smear.

```tsx
<div className="relative grid">
  <motion.span className="col-start-1 row-start-1" animate={{ opacity: [1,0], filter: ["blur(0px)","blur(8px)"] }} transition={{ duration: 0.5 }}>{prev}</motion.span>
  <motion.span className="col-start-1 row-start-1" animate={{ opacity: [0,1], filter: ["blur(8px)","blur(0px)"] }} transition={{ duration: 0.5, delay: 0.1 }}>{next}</motion.span>
</div>
```

## Number ticker / count up

```tsx
import { useEffect } from "react";
import { useMotionValue, useTransform, animate, motion } from "motion/react";
const count = useMotionValue(0);
const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
useEffect(() => { const c = animate(count, 2847, { duration: 2, ease: "easeOut" }); return () => c.stop(); }, []);
return <motion.span>{rounded}</motion.span>;
```

GSAP equivalent: `gsap.to(obj, { val: target, onUpdate: () => (el.textContent = Math.round(obj.val).toLocaleString()), scrollTrigger: { trigger: el, start: "top 85%" } })`.

## Typewriter

```tsx
const [text, setText] = useState("");
useEffect(() => {
  const full = "We build immersive experiences."; let i = 0;
  const id = setInterval(() => { setText(full.slice(0, ++i)); if (i >= full.length) clearInterval(id); }, 45);
  return () => clearInterval(id);
}, []);
return <span>{text}<span className="animate-pulse">|</span></span>;
```

## Word rotate (cycling)

```tsx
<AnimatePresence mode="wait">
  <motion.span key={words[index]} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.35 }}>
    {words[index]}
  </motion.span>
</AnimatePresence>
```

## When to use which

- Headline entrance / scroll reveal: GSAP SplitText `mask: "lines"`.
- Hover label reveal on cards: Motion per-character.
- Decode/secret reveal: scramble or ZProximity `cipher`.
- Decorative living text: CSS gradient (aurora/shiny).
- Stats: number ticker. Hero subline: typewriter or word rotate. Use at most one decorative text effect per viewport.
