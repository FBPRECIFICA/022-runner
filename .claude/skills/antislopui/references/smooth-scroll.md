# Smooth Scroll: Lenis

Lenis is the smooth-scroll standard for this kind of work. It intercepts wheel/touch and animates the scroll position so transforms and ScrollTrigger read a smoothed value. Verified against the Lenis README and `lenis/react`.

## Install and import

```bash
npm i lenis
```

```js
import Lenis from "lenis";
import "lenis/dist/lenis.css"; // required
```

## Constructor options (verified)

| Option | Type | Default | Purpose |
|---|---|---|---|
| `lerp` | number | `0.1` | Interpolation intensity 0 to 1. Lower is smoother/heavier. `0.08` reads very smooth. Overrides duration/easing when set. |
| `duration` | number | `1.2` | Animation duration in seconds (ignored if `lerp` is set). |
| `easing` | function | exponential default | Custom easing `(t) => number`. The common awwwards easing is `(t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))`. |
| `smoothWheel` | boolean | `true` | Smooth wheel events. |
| `wheelMultiplier` | number | `1` | Wheel speed scalar. |
| `touchMultiplier` | number | `1` | Touch speed scalar. |
| `orientation` | string | `"vertical"` | `"vertical"` or `"horizontal"`. |
| `gestureOrientation` | string | `"vertical"` | `"vertical"`, `"horizontal"`, or `"both"`. |
| `infinite` | boolean | `false` | Infinite scroll. |
| `syncTouch` | boolean | `false` | Mimic smooth on touch (can be unstable on iOS < 16). |
| `autoRaf` | boolean | `false` | Auto-run the rAF loop. Set `false` when driving from the GSAP ticker. |
| `anchors` | boolean or object | `false` | Native anchor-link smooth scrolling. |
| `prevent` | function | undefined | `(node) => boolean`, opt a node out of smoothing. |

## Three setup forms

1. **Manual rAF (vanilla, no GSAP):**

```js
const lenis = new Lenis();
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
```

2. **GSAP ticker (vanilla, with ScrollTrigger):** the canonical pairing. Note `time * 1000`.

```js
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

3. **React provider:** see `setup.md` for the full `SmoothScrollProvider`. The minimal root form when not coupling to GSAP:

```tsx
import { ReactLenis } from "lenis/react";
// in app/layout.tsx
<ReactLenis root>{children}</ReactLenis>
```

`ReactLenis` props: `options` (constructor options), `root` (`true` uses `<html>` and exposes the instance globally; `"asChild"` for a custom container), `ref` (forwards `{ lenis }`).

## useLenis hook

```tsx
import { useLenis } from "lenis/react";
const lenis = useLenis((lenis) => {
  // fires on every scroll event; read lenis.scroll, lenis.velocity, lenis.direction, lenis.progress
}, []); // deps array, optional priority arg as 3rd param
```

## scrollTo

```js
lenis.scrollTo("#section", {
  offset: -100,        // like scroll-padding-top, in px
  duration: 1.5,
  easing: (t) => t * t,
  immediate: false,    // true = jump instantly
  lock: false,         // block user scroll until done
  onComplete: () => {},
});
// target: number (px) | selector | "top" | "bottom" | HTMLElement
```

A common pattern (seen in production) is exposing the instance for cross-component calls, then scrolling to top on a page transition:

```js
window.__lenis = lenis;            // in the provider
window.__lenis?.scrollTo(0, { immediate: true }); // during a transition peak
```

## Instance state (read each frame)

```js
lenis.scroll        // current smoothed position
lenis.velocity      // current velocity (drive skew/scale effects)
lenis.direction     // 1 down, -1 up
lenis.progress      // 0..1 of total scroll
lenis.isScrolling   // boolean | "smooth" | "native"
```

Velocity is the secret ingredient for "alive" sites: map `lenis.velocity` to a skewY or image scale for a subtle momentum-reactive feel.

## Nested scrollable areas

Opt internal scrollers (modals, code blocks, maps) out of smoothing with attributes:

```html
<div data-lenis-prevent>           <!-- prevent all -->
<div data-lenis-prevent-wheel>     <!-- wheel only -->
<div data-lenis-prevent-touch>     <!-- touch only -->
```

## Cleanup

```js
lenis.destroy();              // vanilla
return () => lenis.destroy(); // in useEffect
// when on the GSAP ticker, also gsap.ticker.remove(update)
```

## ScrollSmoother (GSAP-native alternative)

If a project is all-GSAP and wants declarative parallax, GSAP ScrollSmoother is an alternative to Lenis (now free). It requires a fixed DOM wrapper.

```js
import { ScrollSmoother } from "gsap/ScrollSmoother";
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
ScrollSmoother.create({ smooth: 3, effects: true, normalizeScroll: true });
```

```html
<div id="smooth-wrapper">
  <div id="smooth-content"><!-- all content --></div>
</div>
<!-- fixed elements (cursor, nav) go OUTSIDE the wrapper -->
```

With `effects: true`, declarative parallax via attributes:

```html
<div data-speed="0.8">slower than scroll</div>
<div data-speed="1.5">faster than scroll</div>
<div data-speed="auto">auto-fill (image parallax)</div>
<div data-lag="0.5">lags behind by 0.5s</div>
```

Choose one smoother per project: Lenis (default, most flexible, used in most awwwards repos) or ScrollSmoother (declarative `data-speed`). Do not run both.

## Locomotive Scroll note

Some older clones use `locomotive-scroll` (`lerp: 0.08`, `data-scroll`, `data-scroll-speed`, `data-scroll-sticky`). v5 is still beta and its attribute API can shift. Prefer Lenis for new AntiSlopUI builds; only match Locomotive when replicating a specific existing site.
