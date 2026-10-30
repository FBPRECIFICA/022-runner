# Anime.js v4 (complete)

Anime.js v4 is a full ESM rewrite: no default export, everything is a named import. Lightweight and precise. Use it for self-contained UI motion, SVG draw/morph/motion-path, draggables, timers, and text effects when GSAP is more than you need. Verified against animejs.com/documentation (v4).

## Install and import

```bash
npm install animejs
```

```js
import { animate, createTimeline, createTimer, createAnimatable, createScope,
         createDraggable, stagger, spring, svg, utils, engine } from "animejs";
// subpath imports also exist: "animejs/timeline", "animejs/timer", "animejs/svg",
// "animejs/text" (splitText, since v4.2), "animejs/draggable", "animejs/scope"
```

## animate(targets, params)

Targets: selector, Element, plain JS object, or array. Properties: CSS (camelCase), transforms (`x, y, z, rotate, rotateX/Y/Z, scale, scaleX/Y, skew, perspective`), CSS vars, SVG attributes, and object props.

```js
animate(".box", {
  x: 320,
  rotate: { to: "1turn", ease: "out(4)" },   // per-property params
  scale: [1, 1.4, 1],                          // keyframes (evenly spaced)
  duration: 800, delay: stagger(60), ease: "outElastic",
  loop: false, alternate: false, autoplay: true,
  onBegin: (a) => {}, onUpdate: (a) => {}, onComplete: (a) => {},
});
```

Per-property params: `to, from, delay, duration, ease, composition ("replace"|"add"|"blend"), modifier`. Values: numbers, units (`"6rem"`, `"50%"`, `"10vw"` with auto-conversion), relative (`"+=100"`, `"-=50"`, `"*=2"`), colors, CSS vars, and function values `(el, i, total) => ...`.

Keyframe forms: property array `x: [0,100,200]`, per-property param array `x: [{to:100},{to:200}]`, animation-level `keyframes: [{x:100},{x:200}]`, or percentage `keyframes: { "0%": {...}, "50%": {...} }`.

Methods on the returned animation: `play, pause, resume, reverse, restart, alternate, complete, cancel, revert, seek(t), stretch(d), refresh, then()`.

## createTimeline(params)

```js
const tl = createTimeline({ defaults: { duration: 750, ease: "out(3)" } });
tl.label("start")
  .add(".square", { x: "15rem" }, 500)        // absolute ms
  .add(".circle", { x: "15rem" }, "start")    // at a label
  .add(".triangle", { x: "15rem", rotate: "1turn" }, "<-=500"); // 500ms before prev end
```

Position syntax: `500` (ms), `"label"`, `"<"` (at previous end), `"<<"` (at previous start), `">>"` (after previous ends), `"<-=500"`, `"+=500"`. Methods: `add, set, sync(otherTimeline, pos), call(fn, pos), label(name, pos), remove, init` plus all playback methods. `init()` initializes without playing (good for scroll-synced setups).

## createTimer(params)

A pure time/tick driver (no targets), useful for counters, sequencing, and frame loops.

```js
createTimer({ duration: 1000, loop: true, frameRate: 30, onUpdate: (t) => {}, onLoop: (t) => {} });
```

## createAnimatable(targets, params)

The right tool for high-frequency value changes (cursor follow, pointer-reactive UI): it keeps a smoothed value you set imperatively, like Anime's version of `gsap.quickTo`.

```js
const sq = createAnimatable(".square", { x: 500, y: 500, ease: "out(3)" }); // per-axis duration in ms
el.addEventListener("mousemove", (e) => { sq.x(targetX); sq.y(targetY); }); // animated setter
sq.x();           // getter
sq.revert();
```

## createScope(params)  (React integration)

Scopes selectors to a root, supports media queries, shares defaults, and reverts everything on cleanup. This is the canonical React pattern.

```tsx
"use client";
import { useEffect, useRef } from "react";
import { animate, createScope, spring } from "animejs";

export default function Logo() {
  const root = useRef(null);
  const scope = useRef<any>(null);
  useEffect(() => {
    scope.current = createScope({ root }).add((self) => {
      animate(".logo", { scale: [{ to: 1.25, ease: "inOut(3)", duration: 200 }, { to: 1, ease: spring({ bounce: 0.7 }) }], loop: true, loopDelay: 250 });
      self.add("spin", (i) => animate(".logo", { rotate: i * 360, ease: "out(4)", duration: 1500 })); // callable via scope.current.methods.spin(n)
    });
    return () => scope.current.revert();
  }, []);
  return <div ref={root}><div className="logo" /></div>;
}
```

`createScope({ root, defaults, mediaQueries: { isSmall: "(max-width: 600px)", reduceMotion: "(prefers-reduced-motion)" } })`. Inside `.add(self => ...)` read `self.matches.isSmall`. Methods: `add, addOnce, keepTime, revert, refresh`.

## stagger(value, options)

```js
animate(".item", { y: 40, delay: stagger(60, { from: "center", grid: [5, 4], axis: "x", ease: "out(3)" }) });
```

Options: `start, from ("first"|"last"|"center"|index|"random"), reversed, ease, grid, axis, modifier, range, total, use`.

## spring(params) and eases

```js
ease: spring({ bounce: 0.7 })                       // perceived: bounce (-1..1), duration (10..10000ms)
ease: spring({ mass: 1, stiffness: 100, damping: 10, velocity: 0 })  // physics
```

Easing strings (v4 functional form): `"linear"`, `"in(n)"`, `"out(n)"`, `"inOut(n)"`, `"outIn(n)"`, the named classics (`"outElastic"`, `"inOutQuad"`, etc.), `"steps(n)"`, `"cubicBezier(x1,y1,x2,y2)"`, and `"linear(0, 0.25 50%, 1)"` multi-stop. Spring and custom functions are passed as functions, not strings.

## SVG: morphTo, createDrawable, createMotionPath

```js
import { svg, animate } from "animejs";
// Draw a stroke on:
const [drawable] = createDrawable(".path");
animate(drawable, { draw: ["0 0", "0 1"], duration: 1500, ease: "inOut(3)" });
// Move along a path:
animate(".dot", { ...createMotionPath(".track"), duration: 2000 });
// Morph one shape into another (tween on the d attribute):
animate("#shapeA", { d: morphTo("#shapeB"), duration: 800 });
```

The three SVG function names are confirmed. Their exact full parameter lists were not captured verbatim, so confirm signatures at animejs.com/documentation/svg before relying on advanced options.

## Text: splitText and scrambleText

```js
import { splitText, createTimeline, stagger } from "animejs";
const { words, chars } = splitText("p", { words: { wrap: "clip" }, chars: true });
createTimeline({ defaults: { ease: "inOut(3)", duration: 650 } })
  .add(words, { y: ($el) => (+$el.dataset.line % 2 ? "100%" : "-100%") }, stagger(125))
  .add(chars, { y: ($el) => (+$el.dataset.line % 2 ? "100%" : "-100%") }, stagger(10, { from: "random" }))
  .init();
```

`splitText` settings: `lines, words, chars` (each Boolean or `{ class, wrap, clone }`), `debug, includeSpaces, accessible`. Returns `{ lines, words, chars }` element arrays plus `addEffect, revert, refresh`; each element carries `dataset.line`.

`scrambleText` is used as a tween value: `animate(".h", { scrambleText: { text: "DECRYPTED", chars, revealRate, revealDelay, cursor, ease } })`.

## onScroll / ScrollObserver

Anime.js has a scroll observer. Settings: `container, target, debug, axis, repeat`; thresholds via numeric (0..1), shorthands (`"start"`, `"center"`, `"end"`), relative (`"100%"`, `"-50px"`), or `{ min, max }`; sync modes (method name string, progress sync 0..1, smooth, eased); callbacks `onEnter/onEnterForward/onEnterBackward/onLeave/onLeaveForward/onLeaveBackward/onUpdate/onSyncComplete/onResize`; methods `link, refresh, revert`. The exact creator/import name was not confirmed verbatim, so verify it at animejs.com/documentation/scroll before use. For production scroll work in a GSAP project, prefer GSAP ScrollTrigger (see scroll-animation.md); use Anime onScroll when the project is Anime-only.

## createDraggable(target, params)

```js
createDraggable(".card", { container: ".bounds", releaseEase: spring({ bounce: 0.7 }), snap: 50, onGrab() {}, onSettle() {} });
```

Per-axis `x`/`y` (Boolean or object with `snap, modifier, mapTo`). Settings include `trigger, container, containerPadding, containerFriction, releaseEase, releaseStiffness, releaseDamping, velocityMultiplier, dragSpeed, dragThreshold, cursor`. Callbacks: `onGrab, onDrag, onUpdate, onRelease, onSnap, onSettle, onResize, onAfterResize`. Methods: `enable, disable, setX, setY, animateInView, scrollInView, stop, reset, revert, refresh`.

## utils and engine

`utils.*`: `set, get, remove, cleanInlineStyles, random, randomPick, shuffle, lerp, clamp, round, snap, wrap, mapRange, interpolate, roundPad, padStart, padEnd, degToRad, radToDeg` and more (chainable forms exist). `engine` controls the global loop: `engine.pauseOnDocumentHidden`, `engine.speed`, `engine.timeUnit ("ms"|"s")`, `engine.fps`, plus `pause()/resume()`.

## GSAP vs Anime.js

Use GSAP for scroll-coupled timelines, pinning, and anything sharing the Lenis ticker. Reach for Anime.js for self-contained UI motion, SVG draw/morph, small bundles, and `createAnimatable` pointer follow. Both can live in one project. Always revert on unmount (`scope.revert()` in React).
