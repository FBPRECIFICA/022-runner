# GSAP Plugins and Utilities (complete surface)

Everything in GSAP beyond core tweens, ScrollTrigger, SplitText, and ScrollSmoother (those are in setup.md, scroll-animation.md, text-effects.md). All plugins are free since the 2025 release. Register before use. Verified against gsap.com/docs/v3 (v3.15).

## Registration and the core object

```js
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { TextPlugin } from "gsap/TextPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
gsap.registerPlugin(Observer, Draggable, InertiaPlugin, Flip, MotionPathPlugin, DrawSVGPlugin, MorphSVGPlugin, ScrambleTextPlugin, TextPlugin, Physics2DPlugin);
```

Core helpers worth using: `gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" })` (rapid per-frame setter, returns a function), `gsap.quickSetter(el, "x", "px")`, `gsap.context(fn, scope)` + `ctx.revert()`, `gsap.matchMedia()`, `gsap.ticker.add/remove/lagSmoothing`, `gsap.registerEffect({ name, effect, defaults, extendTimeline })` (define a reusable named animation called via `gsap.effects.name(targets, config)`), `gsap.exportRoot()`, `gsap.parseEase()`.

## gsap.utils (full)

`clamp(min,max,val)`, `mapRange(inMin,inMax,outMin,outMax,val)`, `normalize(min,max,val)` (to 0..1), `interpolate(a,b,progress)` (numbers, colors, arrays, objects), `snap(increment,val)` or `snap([..],val)`, `random(min,max,snap?)` or `random([..])`, `wrap(min,max,val)`, `wrapYoyo(min,max,val)`, `distribute({base,amount,from,grid,axis,ease})`, `pipe(...fns)`, `unitize(fn,unit)`, `toArray(selector)`, `selector(scope)`, `shuffle(arr)`, `getUnit(val)`, `splitColor(color)`, `checkPrefix(prop)`. Omitting the value argument on `clamp`/`snap`/`wrap`/`mapRange` returns a reusable function (great for `stagger`/`modifiers`/Observer math).

## Eases beyond the core set

Core eases (no import): `none`, `power1..power4`, `back`, `bounce`, `circ`, `elastic`, `expo`, `sine`, `steps(n)`, each with `.in/.out/.inOut`. Default is `power1.out`.

EasePack (`import { EasePack } from "gsap/EasePack"`): `rough({ strength, points, template, taper, randomize, clamp })` for jittery organic motion, `slow(linearRatio, power, yoyoMode)` for a dwell-in-the-middle feel, `expoScale(start, end, innerEase)` for zoom that feels linear in perceived speed.

Custom eases (signature moves, each its own import):
- `CustomEase.create("hop", "M0,0 C0,0 0.5,1.4 1,1")` (SVG path or `.17,.67,.83,.67` cubic-bezier). Lets you draw a bespoke curve so the motion is unmistakably yours.
- `CustomBounce.create("bnc", { strength: 0.7, endAtStart: false, squash: 1, squashID: "bnc-squash" })` then animate `y` with `ease: "bnc"` and `scaleX/scaleY` with `ease: "bnc-squash"` for a real bounce-and-squash.
- `CustomWiggle.create("wig", { wiggles: 10, type: "easeInOut" })` (types: easeOut, easeInOut, anticipate, uniform, random) for shakes and vibrations.

## Observer (unified input)

One API for wheel, touch, pointer, and scroll, debounced per frame. Use it to build fullscreen scroll-jacked section snapping, swipe galleries, and direction-aware reveals without raw event soup.

```js
Observer.create({
  target: window, type: "wheel,touch,pointer",
  tolerance: 10, preventDefault: true,
  onUp: () => goTo(index - 1),
  onDown: () => goTo(index + 1),
  onStop: (self) => {}, onStopDelay: 0.25, lockAxis: true,
});
```

Key callbacks: `onUp/onDown/onLeft/onRight/onChange/onChangeX/onChangeY/onToggleX/onToggleY/onDrag/onDragStart/onDragEnd/onHover/onMove/onPress/onRelease/onWheel/onStop`. Instance reads: `deltaX/deltaY`, `velocityX/velocityY`, `x/y`, `isDragging`, `isPressed`. `ScrollTrigger.observe(...)` is the same API.

## Draggable + InertiaPlugin

```js
Draggable.create(".card", {
  type: "x,y",              // or "rotation", "scroll", "left,top"
  bounds: ".bounds", edgeResistance: 0.65, inertia: true,
  snap: { x: (v) => Math.round(v / 100) * 100 },
  onDrag() {}, onThrowComplete() {},
});
```

`type` options: `x | y | x,y | left | top | rotation | scroll | scrollTop | scrollLeft`. With `inertia: true` it flicks and decelerates. Static `Draggable.hitTest(a, b, threshold)` for drop targets.

InertiaPlugin for physics fling and snap (no Draggable needed), the right way to do "throw it and let it settle back":

```js
InertiaPlugin.track(card, "x,y"); // track velocity on pointermove
// on release:
gsap.to(card, { inertia: {
  x: { velocity: InertiaPlugin.getVelocity(card, "x"), end: startX },
  y: { velocity: InertiaPlugin.getVelocity(card, "y"), end: startY },
}});
```

`end` can be a number, an array of snap values, or a function `(natural) => snapped`. `resistance` and `duration: { min, max }` tune the feel.

## Flip (state-based layout transitions)

The cleanest way to animate between two layouts (grid to list, thumbnail to hero, reordering). Capture, mutate the DOM, then animate.

```js
const state = Flip.getState(".item, .item *", { props: "backgroundColor,borderRadius" });
container.classList.toggle("expanded");      // any DOM/class/position change
Flip.from(state, {
  duration: 0.7, ease: "power3.inOut", absolute: true, stagger: 0.04,
  onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1 }),
  onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0 }),
});
```

Useful options: `absolute`, `absoluteOnLeave`, `nested`, `scale`, `fade`, `spin`, `targets`, `props`, `simple`. In React, recapture state in a layout effect and pass `targets` explicitly. `Flip.fit(a, b)` makes one element match another's size/position.

## MotionPathPlugin

Move an element along an SVG path or an array of points, optionally auto-rotating to face direction.

```js
gsap.to(".rocket", {
  duration: 5, ease: "none",
  motionPath: { path: "#track", align: "#track", alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end: 1 },
});
```

Array path: `motionPath: { path: [{x:0,y:0},{x:200,y:-100},{x:400,y:0}], curviness: 1.5, type: "cubic" }`. Static helpers: `getRawPath`, `getPositionOnPath(rawPath, p, includeAngle)`, `convertToPath(shape)`, `convertCoordinates`, `getRelativePosition`, `pointsToSegment`, `stringToRawPath`/`rawPathToString`. `MotionPathHelper` exists for visual editing (verify its API at the docs before relying on it).

## DrawSVGPlugin (line drawing)

Animates `stroke-dasharray`/`stroke-dashoffset`. Target needs a stroke. This is the proper plugin version of the manual `getTotalLength` trick.

```js
gsap.from(".signature path", { drawSVG: 0, duration: 1.4, ease: "power2.inOut", stagger: 0.15 });
gsap.to(".underline", { drawSVG: "0% 100%" });        // reveal full
gsap.fromTo(".bar", { drawSVG: "50% 50%" }, { drawSVG: "0% 100%" }); // grow from center
// append " live" to recompute length on resize: drawSVG: "0% 100% live"
```

## MorphSVGPlugin (shape morphing)

Tween one SVG path into another. Use for logo-to-icon morphs, blob transitions, liquid shapes.

```js
gsap.to("#blobA", { duration: 1, ease: "power2.inOut", morphSVG: { shape: "#blobB", shapeIndex: "auto", type: "rotational", origin: "50% 50%" } });
```

`type: "rotational"` (handles rotate, usually smoother) vs `"linear"`. `shapeIndex` fixes kinks (use the bundled `findShapeIndex` helper to discover a good value). `curveMode` (3.14) interpolates handle angles. `MorphSVGPlugin.convertToPath("circle, rect, polygon")` turns primitives into paths first.

## ScrambleText and Text plugins

```js
gsap.to(".code", { duration: 2, scrambleText: { text: "DECRYPTED", chars: "upperCase", speed: 1, revealDelay: 0.3, tweenLength: true } });
gsap.to(".line", { duration: 2, text: { value: "Typed out, character by character", delimiter: "" } });
```

`scrambleText.chars`: `upperCase | lowerCase | upperAndLowerCase | "custom01"`. `TextPlugin` types real text in/out (`type: "diff"` only animates changed characters; `delimiter: " "` for word-by-word).

## Physics2DPlugin (particles, confetti, debris)

```js
gsap.to(".spark", { duration: 2, physics2D: { velocity: "random(300,600)", angle: "random(250,290)", gravity: 500, friction: 0.05 } });
```

`angle` in degrees (0 right, 90 down), `gravity` or `acceleration`+`accelerationAngle`, `friction` 0..1. Fully reversible. For non-x/y properties use `physicsProps` (PhysicsPropsPlugin; verify its exact options at the docs).

## GSDevTools (debugging)

```js
GSDevTools.create({ animation: myTimeline, globalSync: false });
```

A scrubber/play UI for tuning timelines during development. Remove before shipping. Keyboard: space play/pause, arrows scrub, L loop.

## Plugins that exist but were not fully read here

These are real GSAP plugins; confirm their exact options at gsap.com/docs before relying on specifics: `PhysicsPropsPlugin`, `MotionPathHelper`, `EaselPlugin`, `PixiPlugin`, `CSSRulePlugin`, `ScrollToPlugin`. Do not invent their option names; open the doc page first.

## Choosing GSAP plugins without slop

Reach for these to create one or two signature moments, not to decorate everything. DrawSVG for a single hand-drawn reveal, MorphSVG for one liquid logo transition, Flip for a gallery-to-detail open, InertiaPlugin for throwable cards, Physics2D for a confetti burst on a real success state. A custom ease (CustomEase/Bounce/Wiggle) applied consistently is one of the cheapest ways to make motion feel authored rather than generated.
