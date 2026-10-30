# Effects Catalog (React reproduction)

A catalog of modern web-effect recipes drawn from the SV-Animations (sv-animations.vercel.app) and Svelte Magic (animation-svelte.vercel.app) catalogs, reproduced for React. The techniques are framework-agnostic; only the original component source is Svelte. ~73 effects total. Each entry: what it is, the technique, the React tool, and key props where documented. Use as accents, one per section at most.

## Cursor and pointer

- **Smooth cursor**: a custom cursor that lags behind the pointer with spring physics. React: `useMotionValue` + `useSpring` on x/y, or `gsap.quickTo`. See cursor-magnetic.md.
- **Follow pointer / spotlight cursor**: an element follows the cursor with a label. React: spring x/y + conditional render on hover.
- **Magic Card (spotlight)**: a radial-gradient glow follows the mouse inside a card; border highlights on hover. Technique: `onMouseMove` sets CSS vars `--mouse-x/--mouse-y`, a `radial-gradient(circle at var(--mouse-x) var(--mouse-y), color, transparent)` overlay. Props: `gradientSize` (200), `gradientColor`, `gradientOpacity` (0.8), `gradientFrom`/`gradientTo`. Pure CSS + one handler.
- **Lens**: a circular magnifier that follows the cursor over content. Technique: a circular `overflow:hidden` div positioned at the cursor, inner content `transform: scale(zoomFactor) translate(...)` offset inversely. Props: `zoomFactor` (1), `lensSize` (100), `isStatic`, `duration` (0.3).
- **Cool Mode**: particle burst (emoji/confetti) on click. Technique: Canvas 2D, spawn particles with velocity + gravity + drag in a rAF loop.

## Backgrounds and patterns

- **Animated Beam**: a glowing gradient travels along an SVG path between two element refs. Technique: compute a cubic-bezier path from `getBoundingClientRect()` of two refs (+ container ref), animate a gradient stroke via `stroke-dashoffset`. Props: `fromRef`, `toRef`, `containerRef`, `curvature` (0), `reverse`, `duration` (4-7), `pathColor`, `pathWidth` (2), `gradientStartColor` (#ffaa40), `gradientStopColor` (#9c40ff). React: ResizeObserver to recompute on layout change.
- **Border Beam**: a light orbits a card border. Technique: an element with `offset-path: border-box` animating `offset-distance` 0%->100% on `repeat: Infinity`, masked to a gradient streak. Props: `size` (50), `duration` (6), `delay`, `colorFrom`/`colorTo`, `borderWidth`, `initialOffset`.
- **Warp Background**: "warp speed" beams converge from all edges over a perspective grid. Technique: N beam divs per side, randomized delay/duration, CSS perspective. Props: `perspective` (100), `beamsPerSide` (3), `beamSize`, `beamDelayMax`, `gridColor`.
- **Retro Grid**: a perspective 3D grid receding to the horizon (synthwave). Technique: CSS `perspective` + `rotateX` on a repeating `linear-gradient` grid. Pure CSS.
- **Flickering Grid**: grid of squares randomly toggling opacity. Technique: Canvas 2D rAF, or CSS grid with interval class toggles.
- **Dot Pattern / Grid Pattern / Striped Pattern**: SVG `<pattern>` backgrounds (circles / lines / diagonals). Pure SVG, framework-agnostic.
- **Animated Grid Pattern**: SVG grid where random cells fade in/out. React: `useState` active cells + AnimatePresence or CSS transitions.
- **Light Rays**: soft animated light shafts descending. Technique: N tall gradient divs (color -> transparent), slow opacity + vertical drift with staggered `animationDelay`. Props: `count` (7), `color`, `blur` (36), `speed`, `length`.
- **Ripple**: concentric expanding rings from center. Technique: stacked circle divs, staggered `scale` + `opacity` keyframe loop.
- **Meteors**: diagonal shooting-star lines. Technique: N absolutely-positioned divs with a `linear-gradient(to bottom right, color, transparent)` tail on a diagonal transform, random delay, CSS translate keyframes.
- **Neon Gradient Card**: card with an animated neon glowing gradient border. Technique: `conic-gradient` rotating via a `--gradient-angle` CSS var + large-blur `box-shadow`.
- **Shine Border**: an animated gradient border. Technique: animated `background-position` on a masked gradient border.
- **Backlight**: a pulsing halo behind an element. Technique: large-blur `box-shadow` in the accent color, animated opacity.
- **Progressive Blur**: gradient blur on content edges. Technique: overlay with `backdrop-filter: blur()` masked by `mask-image: linear-gradient(...)`. Pure CSS.

## Text

(Most also covered in text-effects.md; this is the broader catalog.)

- **Morphing Text**: words blur-dissolve into one another. Two overlapping spans cross-fade `filter: blur()` + `opacity`, offset in time. Props: `texts: string[]`.
- **Hyper Text**: text scrambles with random characters then resolves on hover (matrix decode). `setInterval` replacing undecoded chars; advance decoded count.
- **Aurora Text / Animated Gradient Text / Animated Shiny Text**: `background-clip: text` + animated `background-position` on a multi-stop or shine gradient. Pure CSS.
- **Dia Text Reveal**: a colored gradient band sweeps across `background-clip: text`, supports cycling phrases. Props: `text` (string|string[]), `colors[]`, `duration` (1.5), `triggerOnView`, `once`.
- **Video Text**: video plays through text fill. `<video>` background + `background-clip: text` / `mix-blend-mode`, or canvas masked to text.
- **Line Shadow Text**: text with an animated offset colored shadow.
- **Number Ticker**: count up/down. React: `useMotionValue` + `useTransform` + `animate()`, or GSAP `to({val}, {...})`. See text-effects.md.
- **Typing Animation / Typewriter**: characters appear one at a time via interval.
- **Text Animate**: per-word/char entrance (blur-fade, slide-up). Framer Motion `staggerChildren` on split spans.
- **Word Rotate**: words cycle vertically with AnimatePresence exit/enter y.
- **Flip Text**: characters flip in on the Y axis (scoreboard). Per-char `rotateY: 90 -> 0` with perspective, staggered.
- **Spinning Text**: characters arranged in a circle, the whole circle rotates. CSS `rotate(deg) translateX(r) rotate(-deg)` per char + outer keyframe rotation.
- **Sparkles Text**: random SVG stars spawn around text and animate scale/opacity/rotation.
- **Words Fade In / Pull Up / Letter Pull Up / Blur In / Gradual Spacing / Box Reveal / Text Reveal**: staggered entrance variants. Framer Motion variants on split spans; Box Reveal uses a two-stage `scaleX` overlay; Text Reveal highlights words on scroll via `useInView` per word.

## Buttons

- **Shimmer Button**: a glint sweeps across on hover. `::after` gradient with `background-size: 200%`, animate `background-position`. CSS.
- **Pulsating Button**: a radar ring pulse. CSS keyframe scaling a pseudo-element 1 -> 1.5 with opacity 1 -> 0.
- **Ripple Button**: click spawns an expanding ripple from the click point. `onClick` computes offset, appends a scaled/fading circle (AnimatePresence for exit).
- **Rainbow Button**: animated conic gradient cycling hue via a `--gradient-angle` var. CSS.
- **Interactive Hover Button**: a fill slides in from one side, text transitions. `::before` width 0 -> 100% or clip-path. (See micro-interactions.md fill-from-bottom.)

## Layout and structure

- **Dock**: macOS magnetic magnification. React: ZProximity `nearestPreset="flexScale"` + `neighborPreset="scale"` (zproximity.md), or per-icon `useSpring` keyed to mouse distance.
- **Bento Grid**: varied-size CSS Grid cards with IntersectionObserver entrance. Pure CSS Grid.
- **Marquee**: infinite horizontal band. CSS keyframe `translateX(-50%)` on duplicated content, or Motion/GSAP (see micro-interactions.md).
- **Orbiting Circles**: icons orbit a center. CSS `rotate(deg) translateX(r) rotate(-deg)` + outer keyframe rotation. Pure CSS.
- **Animated List**: items stagger in. Framer Motion `staggerChildren`.
- **Pixel Image**: image assembles from an N x M grid with staggered grayscale -> color reveal. CSS Grid of cells each showing a `background-position` slice; `useMemo` cell array + IntersectionObserver + per-cell `setTimeout`. Props: `grid` ("6x4" etc), `grayscaleAnimation`, `pixelFadeInDuration`, `colorRevealDelay`.
- **Icon Cloud**: 3D rotating sphere of icons. `cobe` or `react-icon-cloud`, or fibonacci-sphere point distribution + 3D->2D projection.
- **Arc Timeline**: events along a curved SVG arc. `path.getPointAtLength()` to position markers.
- **Animated Circular Progress Bar**: SVG ring with animated `stroke-dashoffset`.

## Visual and shader

- **Dither Shader**: real-time ordered dithering on images (bayer/halftone/noise/crosshatch, color modes). Canvas 2D: draw image, sample each pixel against a 4x4 Bayer matrix, quantize to palette; animated mode shifts threshold over time. Use WebGL for the animated mode. Props: `gridSize` (4), `ditherMode`, `colorMode`, `threshold` (0.5), `animated`, `animationSpeed`.
- **Scratch To Reveal**: erase a canvas overlay to reveal content. Canvas `ctx.globalCompositeOperation = "destination-out"` arc on pointer move.
- **Particles**: interactive particle field that attracts/repels near the cursor. Canvas rAF, each particle `{x,y,vx,vy}`, force from cursor distance, velocity damping. Or `@tsparticles/react`.
- **Globe**: 3D interactive globe. `cobe` (1.6kb WebGL) has an official React example, or Three.js.
- **Background Boxes**: hover a grid to light cells with per-position hue. Grid cells with `onMouseEnter` applying a hue-rotated color.
- **Motion Grid**: 2D grid cells switching active/inactive in frame sequences. `useState` 2D array + interval + CSS transitions.

## Discipline

These are spice, not the meal. Pick one signature visual per section. The heaviest to build in React are Dither Shader (WebGL), Animated Beam (path math + ResizeObserver), Pixel Image (tile math), and Globe (WebGL). The cheapest and most reliable are the CSS-only ones (Retro Grid, Ripple, Shimmer, Marquee, Orbiting Circles, gradient text). Always restyle colors to the project palette and respect reduced motion.
