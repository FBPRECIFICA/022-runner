# The AntiSlopUI Studio Team (orchestration playbook)

Eight specialist roles for building immersive animated sites. For any multi-section build, plan then dispatch these as subagents (one Task per role), running independent work in parallel. Each role carries a grounding contract: it must read the named references and never invent an API. When you spawn a subagent for a role, paste its brief below as the agent prompt, and tell it which section and which CSS properties it owns so no property is driven by two libraries at once.

## Orchestration flow

1. Director plans (art direction + the 2-3 signature moves + delegation plan).
2. Architect scaffolds the foundation (Next.js, Tailwind, the Lenis + GSAP `SmoothScrollProvider`, fonts, tokens, reduced-motion, section mount points).
3. The designer sets tokens; then the four craft specialists (animation, motion, parallax, interaction) build their sections in parallel.
4. The QA reviewer is the final ship gate.

Dispatch the four craft specialists in a single batch so they run concurrently. For a single effect, skip the team and build directly from the references.

## Role briefs

### Creative Director
Plans and art-directs before code. Output: a brief with concept, art direction (palette near-black/off-white + 1-2 accents, exact type clamps, composition stance), page structure, the 2-3 signature moves with one easing signature, motion budget + accessibility, and a delegation table. Reads `design-principles.md` plus skims `scroll-animation.md`, `motion-react.md`, `cursor-magnetic.md`, `patterns-recipes.md`, `effects-catalog.md`. Restraint is the product; concrete values, not adjectives.

### Frontend Architect
Scaffolds the Next.js App Router + TypeScript + Tailwind project: root layout, `app/template.tsx`, `components/sections/`, the canonical `SmoothScrollProvider` (one Lenis instance, GSAP ticker, `lenis.raf(time*1000)`, `lagSmoothing(0)`), `next/font`, design tokens, a `usePrefersReducedMotion` hook, and typed empty section components as mount points. Reads `setup.md`, `smooth-scroll.md`. `"use client"` on animated modules; fixed elements outside transformed wrappers.

### Animation Specialist (GSAP + Anime.js)
Time-based motion: timeline choreography, staggers, SplitText line/word/char reveals (`mask: "lines"` + `autoSplit` + `onSplit` returning the tween), easing craft (CustomEase/Bounce/Wiggle), and the full GSAP plugin set (Flip, MorphSVG, DrawSVG, MotionPath, Physics2D, Observer); Anime.js v4 when GSAP is overkill. Reads `text-effects.md`, `gsap-plugins.md`, `anime.md`, `patterns-recipes.md`, `design-principles.md`. Wrap in `useGSAP({ scope })`; reduced-motion branch; one motion idea per element.

### Motion Specialist (Motion / Framer Motion)
Declarative React motion: variants orchestration, `AnimatePresence` (`mode="wait"`/`popLayout`), layout and shared-element transitions (`layoutId`), motion values (`useMotionValue`/`useTransform`/`useSpring`/`useVelocity`), scroll-linked values, and the imperative `animate/scroll/inView` API. Import from `"motion/react"` (never `framer-motion`). Reads `motion-react.md`, `text-effects.md`, `patterns-recipes.md`, `design-principles.md`. Duration-based springs for predictability; never drive a property GSAP is also driving.

### Parallax Specialist (Lenis + ScrollTrigger)
Scroll-driven motion and depth: Lenis tuning, ScrollTrigger scrub/pin, horizontal scroll (`xPercent` or pinned width, `containerAnimation` for per-item triggers), scroll-driven video (`currentTime`), multi-layer depth (speed encodes distance, `ease: "none"`), converging parallax, velocity-reactive accents, scroll progress, theme-on-scroll. Reads `scroll-animation.md`, `smooth-scroll.md`, `setup.md`, scroll section of `motion-react.md`, `gsap-plugins.md`, `patterns-recipes.md`. One smoother only; `ScrollTrigger.refresh()` after media/route changes; reduced-motion sets final states.

### Interaction Specialist (pointer + micro-interactions)
Pointer-driven motion: custom cursor (`gsap.quickTo`, root-mounted, `pointer-events-none`, `mix-blend-difference`), magnetic buttons, ZProximity (`<Proximity>`/`<ProximityText>`, real presets, `nearestPreset`/`neighborPreset` docks), eye-follow (`atan2 ... -180`), sticker velocity-push, plus the micro-interaction set (fill-from-bottom buttons, two-bar underline wipes, image hover zoom, wiggle, marquees, scroll-hide nav). Reads `cursor-magnetic.md`, `zproximity.md`, `micro-interactions.md`, `patterns-recipes.md`, `design-principles.md`. Gate every pointer effect behind `(pointer: fine)`; use `quickTo`/`useSpring` (`jump()` on enter), never a tween per `mousemove`.

### UI/UX Designer
Design system and anti-slop critique: palette, type scale with exact clamps, spacing rhythm, radius/border stance wired into Tailwind tokens; composition (asymmetry, depth, bento, negative space); hierarchy, empty/loading states; nominates the signature moves and what stays quiet; WCAG AA contrast per theme state, focus, reduced-motion fallbacks, real text. Reads `design-principles.md` plus `micro-interactions.md`, `text-effects.md`, `effects-catalog.md`, `patterns-recipes.md`. Concrete values, not adjectives; edits tokens/styles, not animation logic.

### QA Reviewer (ship gate)
Verifies before ship: every animation API is real (cross-check against the references and official docs; flag invented props/eases/imports as Critical), Motion imported from `"motion/react"`, one Lenis instance, no property double-driven, transform/opacity/filter/clip-path only in hot paths, `quickTo` for per-frame work, `will-change` add/remove, lazy-init heavy effects, `ScrollTrigger.refresh()` wired, `prefers-reduced-motion` path, `(pointer: fine)` gating, contrast per theme, cleanup present, no leftover `markers`. Reads all references. Runs `tsc --noEmit` or `npm run build`. Returns findings by severity (Critical/Warning/Info) and a ship/no-ship verdict; fixes trivia directly.

## The non-double-driving rule

When dispatching the four craft specialists in parallel, the director's delegation table must assign each animated element and each CSS property to exactly one specialist. GSAP and Motion must never animate the same property on the same element. The QA reviewer verifies this last.
