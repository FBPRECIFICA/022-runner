# ZProximity Engine

`z-proximity-engine` is a declarative React + GSAP library for cursor-proximity and scroll-proximity effects. It computes per-element distance to the cursor each frame and maps it to animated properties through named presets, so you get magnetic docks, tilt, repel, cipher decode, and cursor-fill text without writing the distance math. Verified from source.

## Install

```bash
npm install z-proximity-engine gsap @gsap/react
```

Peer deps: `react` 18/19, `gsap` ^3.15, `@gsap/react` ^2.1. React-only (the engine class is framework-agnostic TS but is exposed through React components).

```tsx
"use client";
import { Proximity, ProximityText } from "z-proximity-engine";
```

## Components

`<Proximity>` wraps a group of children and animates the ones matching `selector` (default `.prox-item`). It renders a `position: relative` container and dispatches to pointer mode (default) or scroll mode.

```tsx
<Proximity preset="scale-magnetic" reach={2} falloff={2.4} duration={0.2}>
  <button className="prox-item">One</button>
  <button className="prox-item">Two</button>
</Proximity>
```

`<ProximityText>` splits a string into per-letter/word/line spans, each individually animated.

```tsx
<ProximityText text="HOVER ME" preset="scale-opacity-cipher" splitBy="letter" reach={1.5} />
```

## How presets combine

Chain presets with dashes; they stack. `preset="scale-magnetic-tilt"` applies all three. Two extra targeting props refine a group:

- `nearestPreset`: applied only to the single closest element (on top of `preset`).
- `neighborPreset`: applied to all other active (non-nearest) elements.

This is exactly how a macOS dock works: nearest icon scales and goes magnetic, neighbors get pushed.

## Core config (verified)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `"pointer" \| "scroll"` | `"pointer"` | Trigger source |
| `reach` | number | `2` | Influence radius, multiplied by 200px internally (reach 2 = 400px) |
| `falloff` | number | `2.4` | Exponential decay steepness; higher means the effect only fires very close |
| `duration` | number | `0.2` | quickTo animation duration |
| `ease` | EasePreset or GSAP string | `"power1.out"` | Named ease (see table) or any GSAP ease |
| `preset` | string | - | Dash-chained presets |
| `nearestPreset` | string | - | Extra preset for the closest element |
| `neighborPreset` | string | - | Extra preset for the rest |
| `selector` | string | `".prox-item"` | Which children to animate |
| `lockAxis` | `"x" \| "y" \| "both" \| "none"` | - | Restrict directional presets (use `"x"` for a horizontal dock) |
| `maxTravel` | number, [x,y], or {x,y} | - | Clamp displacement |
| `global` | boolean | `false` | Track the pointer anywhere in the window, not just inside the container |
| `stagger` | number or gsap.StaggerVars | - | Stagger enter animation |
| `disableOnMobile` | boolean, string, string[] | - | Disable all or named presets on mobile |
| `onCalculate` | `(intensity, distance, dx, dy, isNearest) => gsap.TweenVars` | - | Full custom per-frame mapping, bypasses presets |

Per-preset overrides accept `[baseValue, maxValue]`, for example `scale={[1, 1.4]}`, `blur={[8, 0]}`, `magnetic={[0, 0.15]}`. Color presets accept `[fromColor, toColor]`.

## Presets (verified defaults [base, max])

Movement/transform: `scale [1,1.5]`, `flexScale [1,1.5]` (adjusts margins so flex layout does not collapse), `x [0,30]`, `y [0,-30]`, `magnetic [0,0.1]` (pulls toward cursor), `repel [0,0.4]` (pushes away), `rotate [0,90]`, `skew [0,20]`, `tilt [0,30]` (3D rotX/rotY with perspective), `tiltCard [0,15]` (normalized to element size).

Filters/visual: `blur [8,0]`, `glow [0,20]` (drop-shadow), `brightness [0.6,1.2]`, `contrast [0.8,1.4]`, `grayScale [1,0]` (gray at rest, color near cursor), `opacity [0.2,1]`, `borderRadius [0,50]`.

Color/type: `color [#888,#fff]`, `background [transparent, rgba(255,255,255,.1)]`, `weight [100,900]` (variable-font weight), `letterSpacing [-0.05,0.2]`.

Text/special: `cipher` (scrambles text, decodes near cursor), `reveal` (clip-path wipe), `fill` (radial gradient grows from cursor position on the element), `fillText` (same plus `background-clip: text`, so text color fills from the cursor), `cycle`/`cycleSide` (clip-path scroll cycle).

Velocity-driven: `velocitySkew [-15,15]`, `velocityScale [0.95,1.05]` (react to pointer speed).

## Named ease presets (verified)

`smooth` (power1.inOut), `heavy` (power4.out), `sharp` (expo.out), `fluid` (circ.inOut), `bouncy` (back.out(1.7)), `elastic` (elastic.out(1,0.3)), `jello` (elastic.out(1.5,0.2)), `spring` (elastic.out(1,0.75)), `anticipate` (back.inOut(2)), `glitch`, `robot` (steps(8)), `slowmo`, and more. Pass any of these to `ease`, or pass a raw GSAP ease string.

## Recipes (verified)

macOS dock:

```tsx
<Proximity nearestPreset="scale-magnetic" neighborPreset="repel" reach={2.5} lockAxis="x">
  {icons.map((i) => <img key={i.id} src={i.src} className="prox-item" />)}
</Proximity>
```

Cipher decode on a heading:

```tsx
<ProximityText text="CLASSIFIED" preset="cipher-scale" reach={2} splitBy="letter" />
```

Cursor-fill text (color floods out from the pointer):

```tsx
<ProximityText text="ILLUMINATED" preset="fillText" splitBy="letter" />
```

Custom per-frame mapping (skip presets entirely):

```tsx
<Proximity onCalculate={(intensity, distance, dx, dy, isNearest) => ({
  rotation: intensity * 45,
  filter: `hue-rotate(${intensity * 180}deg)`,
})}>
  {/* .prox-item children */}
</Proximity>
```

Scroll-reveal mode (uses GSAP ScrollTrigger under the hood):

```tsx
<Proximity mode="scroll" preset="reveal-opacity" scroll={{ start: "top 90%", once: true }} stagger={0.2}>
  {/* .prox-item children */}
</Proximity>
```

## When to use ZProximity vs hand-rolled

Use ZProximity when you want several proximity behaviors at once (dock, magnetic grid, cipher walls, fill-text headings) and do not want to maintain the spatial-grid and quickTo plumbing yourself. For a single magnetic button or one custom cursor, the hand-rolled `quickTo` patterns in `cursor-magnetic.md` are lighter (no extra dependency). Both rely on GSAP, so they coexist cleanly.
