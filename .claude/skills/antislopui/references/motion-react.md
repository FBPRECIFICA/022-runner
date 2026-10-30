# Motion for React (Framer Motion)

The declarative animation library. Package `motion`, import from `"motion/react"`. Formerly framer-motion. Verified against motion.dev. Do not import `framer-motion`. For React Server Components use `"motion/react-client"`.

```tsx
"use client";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useMotionValueEvent } from "motion/react";
```

## The motion component

Every element has a motion variant: `motion.div`, `motion.section`, `motion.button`, `motion.a`, `motion.img`, `motion.path`, etc.

```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
/>
```

- `initial`: starting state (object, variant label, or `false` to skip the enter animation).
- `animate`: target on mount and on update.
- `exit`: target when removed; requires an `<AnimatePresence>` ancestor.
- Transform shorthands animate independently: `x`, `y`, `scale`, `rotate`, `skewX`, `originX/Y`. Animatable: any CSS value, `clipPath`, `filter`, `backgroundColor`, CSS variables, and SVG `pathLength`.
- Keyframes: `animate={{ x: [0, 100, 0] }}`. Wildcard `[null, 100, 0]` means "from current value".

Wrap a custom component: `const M = motion.create(Component)` (component must forward its ref).

## transition

```tsx
transition={{ duration: 0.6, delay: 0.1, ease: "easeInOut" }}
```

- **tween**: `duration`, `ease`. Named eases: `linear, easeIn, easeOut, easeInOut, circIn/Out/InOut, backIn/Out/InOut, anticipate`, or a `[x1,y1,x2,y2]` cubic-bezier array.
- **spring** (physics): `{ type: "spring", stiffness, damping, mass }`. Or duration-based: `{ type: "spring", visualDuration: 0.5, bounce: 0.25 }`. Duration-based is easier to reason about.
- **inertia**: used by drag, `{ type: "inertia", power, timeConstant, modifyTarget }`.
- Per-value transitions: nest `transition` inside the `animate` object with a `default` fallback.

Global defaults via `<MotionConfig transition={{ ... }}>`.

## Gestures

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ outline: "2px solid currentColor" }}
  onHoverStart={(e) => {}}
  onTap={(e) => {}}
/>
```

Drag:

```tsx
<motion.div drag dragConstraints={{ left: -100, right: 100 }} dragElastic={0.2} dragMomentum={false} whileDrag={{ scale: 0.95 }} />
```

## whileInView (scroll-into-view reveal)

```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3, margin: "0px 0px -10% 0px" }}
  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
/>
```

`viewport`: `once` (trigger once), `amount` (`"some" | "all" | 0..1` visible), `margin` (rootMargin), `root` (a scrollable ancestor ref).

## Variants and stagger

Variants propagate down the tree and orchestrate children.

```tsx
import { stagger } from "motion/react";
const list = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { when: "beforeChildren", delayChildren: stagger(0.08) } } };
const item = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

<motion.ul variants={list} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {items.map((t) => <motion.li key={t} variants={item}>{t}</motion.li>)}
</motion.ul>
```

Dynamic variants use a `custom` prop: `visible: (i) => ({ opacity: 1, transition: { delay: i * 0.05 } })`.

## AnimatePresence (exit animations)

```tsx
<AnimatePresence mode="wait">
  {open && (
    <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
  )}
</AnimatePresence>
```

`mode`: `"sync"` (default), `"wait"` (exit finishes before enter, one child only), `"popLayout"` (exiting items pop out of layout so siblings reflow; pair with `layout`). Other props: `initial={false}` to skip first-render animations, `onExitComplete`, `custom`, `propagate`.

## Layout animations

```tsx
<motion.div layout />                 {/* animate layout changes automatically */}
<motion.img layout="position" />      {/* position only, avoids image distortion */}
<motion.div layoutId="card-1" />      {/* shared-element transition between two elements */}
```

Wrap siblings in `<LayoutGroup>` to sync. Add `layoutScroll` on scroll containers and `layoutRoot` on fixed containers. `layoutId` across an `AnimatePresence` boundary creates magic-move transitions (great for nav indicators, modals, image-to-detail).

## Scroll-linked motion values

`useScroll` returns MotionValues that update without re-rendering.

```tsx
const { scrollYProgress } = useScroll();                 // whole page 0..1
const ref = useRef(null);
const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end start"] });
```

`useTransform` maps a MotionValue to a new range:

```tsx
const y = useTransform(p, [0, 1], ["-20%", "20%"]);      // parallax
const opacity = useTransform(p, [0, 0.5, 1], [0, 1, 0]);
return <motion.div ref={ref}><motion.div style={{ y }} /></motion.div>;
```

`useSpring` smooths a MotionValue (scroll progress bars feel premium with it):

```tsx
const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
return <motion.div style={{ scaleX, transformOrigin: "0%" }} className="fixed top-0 h-1 w-full bg-current" />;
```

`useMotionValueEvent` reads changes (scroll-direction nav hide, see micro-interactions.md):

```tsx
const { scrollY } = useScroll();
useMotionValueEvent(scrollY, "change", (latest) => { /* compare with scrollY.getPrevious() */ });
```

## Converging two-image parallax (verified pattern)

Two images fly in from opposite corners and settle into a layered composition. Each gets its own `useTransform` chain off one progress value.

```tsx
const ref = useRef<HTMLDivElement>(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const x1 = useTransform(scrollYProgress, [0, 1], ["25%", "45%"]);
const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
const r1 = useTransform(scrollYProgress, [0, 1], ["8deg", "4.9deg"]);
const x2 = useTransform(scrollYProgress, [0, 1], ["-45%", "0%"]);
const y2 = useTransform(scrollYProgress, [0, 1], ["20%", "0%"]);

return (
  <div ref={ref} className="relative">
    <motion.img style={{ x: x1, y: y1, rotate: r1 }} src="/a.jpg" />
    <motion.img style={{ x: x2, y: y2 }} src="/b.jpg" className="absolute top-0 w-full" />
  </div>
);
```

## Horizontal scroll (Motion version)

```tsx
const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);
return (
  <div ref={ref} style={{ height: "300vh" }}>
    <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
      <motion.div style={{ x, display: "flex" }}>{/* slides */}</motion.div>
    </div>
  </div>
);
```

## Other hooks

`useInView(ref, { once, amount })` returns a boolean. `useAnimate()` returns `[scope, animate]` for imperative sequences. `useReducedMotion()` respects the OS setting. `useVelocity(value)` and `useMotionTemplate` compose values.

## Paid extras (Motion+)

`AnimateNumber`, `Carousel`, `Cursor` (magnetic/morph), `ScrambleText`, `Ticker`, `Typewriter` are part of the paid Motion+ package. The free patterns in this skill cover all of these; reach for Motion+ only if the user already owns it.

## Imperative API and advanced hooks

Beyond declarative `motion` components, Motion ships an imperative layer and a full hook set. Import from `"motion/react"` (or `"motion"` for the framework-agnostic functions).

### animate(), scroll(), inView(), stagger() (imperative)

```js
import { animate, scroll, inView, stagger } from "motion/react";
const controls = animate(el, { opacity: 1, x: 0 }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
animate([[".a", { x: 100 }], [".b", { opacity: 1 }, { at: "<" }]]); // sequence; at: number | "<" | ">"
controls.pause(); controls.play(); controls.stop(); controls.complete(); controls.speed = 0.5; await controls.finished;
animate(motionValue, 100, { type: "spring" });                       // animate a MotionValue directly
scroll(animate(".bar", { scaleX: [0, 1] }), { target: ref, offset: ["start start", "end end"] }); // scroll-linked
const stop = inView("section", (entry) => { animate(entry.target, { opacity: 1 }); }, { amount: 0.3 });
```

### Hooks

- `useAnimate()`: `const [scope, animate] = useAnimate();` scoped imperative animation with auto-cleanup; `animate("li", {...})` is scoped to the ref; supports sequence arrays and returns controls. Pair with `usePresence` for custom exit animations.
- `useVelocity(value)`: MotionValue of velocity; chain twice for acceleration. Map to skew or scale for momentum effects.
- `useMotionTemplate`: compose MotionValues into a string MotionValue, e.g. ``useMotionTemplate`blur(${v}px)` ``.
- `useTime()`: elapsed ms MotionValue since mount; drive continuous loops with `useTransform(time, [0, 4000], [0, 360], { clamp: false })`.
- `useInView(ref, { once, amount, margin, root })`: boolean.
- `useAnimationFrame((time, delta) => {})`: per-frame callback.
- `useDragControls()`: manual drag start via `controls.start(event, { snapToCursor: true })` with `dragListener={false}` on the draggable.
- `useReducedMotion()`: `boolean | null`; branch animations off it.

### Components

- `MotionConfig`: global default `transition` plus `reducedMotion="user" | "always" | "never"`.
- `LazyMotion` + `features` (`domAnimation`, `domMax`) with the `m` component for bundle-size code splitting.
- `LayoutGroup`: sync layout animations across separate components.
- `Reorder.Group` / `Reorder.Item`: drag-to-reorder lists (`axis`, `values`, `onReorder`).

### Transition reference (full)

`type: "tween"` (`duration`, `ease` as a name / `[x1,y1,x2,y2]` / function, `times[]`), `type: "spring"` (`bounce` + `visualDuration`, or `stiffness`/`damping`/`mass`/`velocity`/`restSpeed`/`restDelta`), `type: "inertia"` (`power`, `timeConstant`, `modifyTarget`, `min`/`max`, `bounceStiffness`/`bounceDamping`). Orchestration: `delay` (negative starts mid-animation), `repeat`, `repeatType: "loop" | "reverse" | "mirror"`, `repeatDelay`, `when: "beforeChildren" | "afterChildren"`, `delayChildren: stagger(0.1, { from, ease })`. Per-value control via a `default` key plus per-property overrides.
