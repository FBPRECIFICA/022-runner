# Signature Awwwards Patterns (from real source)

Non-obvious techniques extracted verbatim from the reference repositories. These are what separate award-winning sites from generic ones. Each recipe names its source. Use them as the signature moves the design calls for, not all at once.

## Scroll choreography

**containerAnimation (elements animate relative to horizontal scroll)** [Truus]. Inside a horizontal-scroll section, give a child its own ScrollTrigger but pass the horizontal tween as `containerAnimation` so it fires on horizontal position, not page scroll.

```js
const scrollTween = gsap.to(".track", { xPercent: -300, ease: "none", scrollTrigger: { trigger: ".cont", pin: true, scrub: 1, end: "+=3000" } });
gsap.from(".track .letter", {
  yPercent: () => (Math.random() - 0.5) * 500, rotation: () => (Math.random() - 0.5) * 60, ease: "elastic.out(1.2, 1)",
  scrollTrigger: { trigger: ".letter", containerAnimation: scrollTween, start: "left 90%", end: "left 50%", scrub: 0.5 },
});
```

**stagger + scrub word illuminate** [splyt]. SplitText words change color with `stagger: 1` inside a scrubbed trigger, so words light up left-to-right at a rate set by the scroll window.

```js
gsap.from(split.words, { color: "#555", stagger: 1, ease: "none", scrollTrigger: { trigger: ".msg", start: "top 70%", end: "bottom center", scrub: true } });
```

**counter-parallax split text in a horizontal pin** [splyt]. During a horizontal pin, move text layers at `xPercent: -30, -22, -10` while the section translates left, producing depth with no z-axis.

**section cross-fade factory** [gentlerain]. A function returns a configured timeline so repeated section transitions stay DRY.

```js
const sectionAnim = (main, prev, next, nav) => gsap.timeline({ scrollTrigger: { trigger: main, start: "top 90%", end: "top 0%", scrub: true } })
  .to(prev, { opacity: 0, y: "20%" }, "s").from(next, { opacity: 0, y: "-20%" }, "s").from(nav, { backgroundColor: "#fff" }, "s");
```

**multi-keyframe dwell-then-exit** [the-line-studio]. A four-stop `useTransform` makes a card enter, settle, hold, then exit. Parent and child get independent transforms for parallax within the card.

```tsx
const y = useTransform(scrollYProgress, [0, 0.5, 0.6, 1], ["55vh", "0vh", "0vh", "-55vh"]);
```

**scroll-driven video scrub** [mojito]. Pin a `<video>` and drive `currentTime`. Set up after `loadedmetadata`; differ start/end per breakpoint. (Full code in scroll-animation.md.)

**mask-size reveal** [mojito]. Scrub a PNG `mask-size` from 50% to 400% inside a pinned timeline while fading flanking elements and revealing content. Mask-driven, no clip-path.

**3D z-axis fly-in during horizontal scroll** [otis-valen]. Pin for `5 * innerHeight`; in `onUpdate` pan a 500vw title and fly images from `z: -1500` to `z: 1500` with per-image stagger, on a `perspective: 500px; transform-style: preserve-3d` container.

**animated progress line** [lemontree]. A black bar `w-0 -> 100%` inside a pill, scrubbed, as a mechanical progress indicator.

**GPU promotion + anticipatePin** [JeskoJets]. Add an imperceptible `rotation: 0.01` to force GPU compositing, and `anticipatePin: 1` to prevent the pin jump.

**data-color body theme on scroll** [motion-website]. Sections carry `data-color`; ScrollTrigger callbacks set `document.body` attribute; all color logic lives in CSS. (Full code in scroll-animation.md.)

## Cursor and pointer physics

**cursor jump() vs set()** [the-line-studio]. On `mouseenter`, `left.jump(x)` teleports a spring value so the cursor appears where the mouse entered; subsequent `mousemove` uses `left.set(x)` to spring-follow. Eliminates the "chase from the corner" artifact.

```tsx
const left = useSpring(0, { mass: 1, damping: 38, stiffness: 260 });
const onEnter = (e) => { left.jump(e.clientX); top.jump(e.clientY); setVisible(true); };
const onMove = (e) => { left.set(e.clientX); top.set(e.clientY); };
```

**InertiaPlugin fling-and-snap** [Truus]. Track pointer velocity on move; on release, throw with that velocity and snap back via the `end` parameter. The physics-correct "fling and return". (Code in gsap-plugins.md.)

**image trail on mousemove** [otis-valen]. After a movement threshold (about 100px), create an `<img>` at `scale(0)` with a CSS transition, then `setTimeout(10)` to `scale(1)`; remove later by transitioning back. No animation library.

**image explosion footer** [otis-valen]. Spawn work-image particles at center, then a rAF physics loop: `vy += 0.25` (gravity), `vx *= 0.99` (friction), update transform each frame.

## Transitions and preloaders

**strokeDashoffset erase + scroll reset** [Truus]. Draw a scribble forward to cover the screen (animate `strokeWidth` up), call `lenis.scrollTo(0, { immediate: true })` at the peak, then animate `strokeDashoffset` to `-length` to erase in the same direction. Randomize stroke color per navigation. (Full code in page-transitions-preloader.md.)

**multi-layer color wipe** [otis-valen]. Five stacked overlays, each a brand color. Enter: `scaleY 0->1, stagger 0.1, transformOrigin bottom`. Exit: `scaleY 1->0, stagger -0.1, transformOrigin top`. Return a Promise; navigate in `.then()`.

**revertOnUpdate carousel** [0xGajendra]. `useGSAP(fn, { dependencies: [index], revertOnUpdate: true })` kills and reverts prior clip-path states before re-running, so carousel frames do not stack.

## Micro-interactions and structure

**steps(1) wiggle** [Truus]. `gsap.to(el, { rotation: n, duration: 0.17, repeat: -1, yoyo: true, ease: "steps(1)" })` gives a binary digital jitter (no smoothing). (Code in micro-interactions.md.)

**dimension pop-out + reverse-stagger collapse** [Truus]. Measure real `width`/`height` while visible, collapse to 0, animate to measured values on open; on close, `stagger: -0.03` removes items right-to-left. Animates real dimensions without `scale` clipping or `height: auto` jank.

**IntersectionObserver theme sentinel** [the-line / the-line-studio]. An invisible div at section boundaries (or `threshold: 1` on a card) drives nav color via a context provider. `isIntersecting ? lightTheme : (top < 0 ? darkTheme : ...)` handles both scroll directions. No scroll listeners, no GSAP.

```tsx
([{ isIntersecting, boundingClientRect: { top } }]) => {
  if (isIntersecting) setNavTheme(enterTheme);
  else if (top < 0) setNavTheme(exitTheme);
}
```

**MotionValue passed as a prop** [the-line]. Create a `MotionValue` in the parent, pass it to a child that sets it imperatively on `isInView`; the parent wraps siblings in `<motion.div style={{ backgroundColor }}>`. A child drives a parent's background with zero re-renders.

**draggable scrollbar synced to window scroll** [the-line-studio]. `<motion.div drag="y" dragConstraints={ref} dragMomentum={false}>`; two `useTransform` calls map between a `scrollY` MotionValue and the thumb `y`; `useMotionValueEvent` calls `window.scrollTo`, and native scroll updates `scrollY.set()`.

**per-letter flicker via times[]** [the-line-studio]. Each letter `motion.span` gets a computed `times` array (`times[i] = i * (x/2)` as a proportion of duration) so a screen-flicker cascades left-to-right on hover.

**gooey SVG filter** [0xGajendra]. An invisible SVG `feGaussianBlur stdDeviation="8"` + `feColorMatrix` with a high alpha multiplier, applied via `filter: url(#goo)`, merges nearby shapes into organic blobs without clip-path. The core trick behind gooey toasts and blob menus.

```html
<svg style="position:absolute;width:0;height:0"><filter id="goo">
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/>
  <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"/>
</filter></svg>
```

**audio visualizer bars** [0xGajendra]. Four bars, each `animationDelay: i * 0.1s`, CSS keyframe `height 4px -> 16px -> 4px`; toggle `.active` on play. A polished ambient indicator.

## WebGL signature

**wave-equation ripple (ping-pong)** [gentlerain]. Two `WebGLRenderTarget`s ping-pong a finite-difference wave equation each frame (channels: r=pressure, g=velocity, ba=gradient). The mouse injects pressure within a UV radius; the gradient channels become a UV distortion vector that warps a canvas-drawn text texture into water ripples. Self-contained GLSL, no physics library. Reach for this as a hero centerpiece only, and lazy-init it with IntersectionObserver.

## How to deploy these

Pick the two or three that match the brief (one scroll signature, one pointer signature, one transition) and execute them precisely; keep everything else calm. That selectivity, plus a consistent easing palette, is what reads as designed rather than generated.
