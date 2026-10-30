---
name: antislopui
description: Build interactive, immersive, awwwards-grade animated websites in React and Next.js. Use when the user wants a creative or animated site, smooth scrolling, scroll-triggered reveals, parallax, pinned or horizontal scroll, scroll-driven video, a custom cursor, magnetic or proximity hover effects, text reveals, marquees, page transitions, a preloader, or any "aesthetic / immersive / motion / awwwards / anti-generic" front-end. Triggers include GSAP, ScrollTrigger, Lenis, Motion, Framer Motion, Anime.js, ZProximity, parallax, scroll animation, hero section, page transition, custom cursor, and magnetic button.
---

# AntiSlopUI

Author: brian (Ade Febrian). GitHub https://github.com/Adefebrian, Instagram https://www.instagram.com/artificalbrian/. A creative-development playbook for shipping immersive, animated React/Next.js sites that look hand-built by a studio, not generated. Every API and pattern here is grounded in the real library docs and real awwwards repositories. Do not invent props or imports. If unsure, open the relevant reference file and copy the verified pattern.

## The AntiSlopUI promise (anti-slop)

Generic motion is worse than no motion. Reject the slop defaults: everything fading up 20px on scroll, identical 0.3s ease-in-out on every element, a drop shadow on every card, centered single-column everything. Build with intent instead.

Five principles, applied to every build:

1. **Motion has a reason.** Reveal hierarchy, guide the eye, reward interaction, or express brand. If a movement does none of those, cut it.
2. **Easing is identity.** Never ship the browser default. Use the AntiSlopUI easing palette (in `references/design-principles.md`). Expressive eases (`expo.out`, `power4.out`, `elastic.out`, custom cubic-beziers like `[0.76, 0, 0.24, 1]`) are what separate studio work from slop.
3. **Type is the hero.** Oversized display type (clamp up to `text-[9vw]`/`text-[17vw]`), tight leading, a serif/grotesk contrast, mask-clipped line reveals. Treat the headline as the centerpiece, not decoration.
4. **Space and asymmetry.** Generous negative space, an off-grid or bento composition, layered depth. Avoid the centered-stack template.
5. **Restraint in color, boldness in motion.** Near-black and off-white (never `#000`/`#fff`), one or two accents, theme that shifts on scroll. Let the movement carry the energy.

Performance and accessibility are not optional: animate only `transform`, `opacity`, `filter`, and `clip-path`; honor `prefers-reduced-motion`; use `gsap.quickTo`/`quickSetter` for per-frame work. See `references/design-principles.md`.

## The non-negotiable stack

Default to **Next.js (App Router) + TypeScript + Tailwind CSS**, with this animation core:

```bash
npm install gsap @gsap/react lenis motion
# gsap          core tweens + ScrollTrigger + SplitText + ScrollSmoother (all free since 2025)
# @gsap/react   the useGSAP() hook (SSR-safe cleanup)
# lenis         smooth scroll (pairs with GSAP via the ticker)
# motion         Motion for React, formerly framer-motion (import from "motion/react")
# optional: animejs (timeline/UI motion), z-proximity-engine (proximity/magnetic engine)
```

Two facts that prevent the most common mistakes:

- The Motion library import is `"motion/react"` (package `motion`), not `"framer-motion"`. For React Server Components use `"motion/react-client"`. `framer.com/developers` is the no-code site builder, not this library; the real docs are `motion.dev`.
- All GSAP plugins (ScrollTrigger, SplitText, ScrollSmoother, Flip, MorphSVG, DrawSVG, MotionPath, Observer, Inertia, Physics2D) are now free. Always `gsap.registerPlugin(...)` in a `"use client"` module before use.

Every animated module in Next.js App Router needs `"use client"`. Smooth scroll is set up once at the root with a `SmoothScrollProvider` that wires Lenis into the GSAP ticker. Build it from `references/setup.md` first on any new project.

## Choose the right tool

- **GSAP + ScrollTrigger**: the backbone for scroll. Scrub timelines, pinning, horizontal scroll, scroll-driven video, complex sequencing, snap. Plus the full plugin set (Flip, MorphSVG, DrawSVG, MotionPath, Observer, Draggable, Inertia, Physics2D) in `references/gsap-plugins.md`. Use for anything timeline-shaped, scrubbed, or physics/SVG-driven.
- **Motion (Framer Motion)**: declarative component motion. Mount/exit (`AnimatePresence`), gestures (`whileHover`/`whileTap`), layout animations (`layoutId`), variants/stagger, scroll-linked values (`useScroll` + `useTransform`), and the imperative `animate/scroll/inView` API. Use for UI state and React-driven motion.
- **Lenis**: smooth scroll only. Never reimplement scrolling; configure Lenis and let GSAP/Motion read it.
- **Anime.js v4**: lightweight standalone timelines, SVG draw/morph/motion-path, draggables, text split, UI flourishes when GSAP is overkill. Full API in `references/anime.md`.
- **ZProximity (`z-proximity-engine`)**: declarative cursor-proximity effects (magnetic, tilt, repel, cipher, dock, fill-text) without hand-writing the distance math. React + GSAP.

Mixing GSAP and Motion in one project is normal and fine. Do not drive the same property with both at once.

## The AntiSlopUI agent team (delegate large builds)

AntiSlopUI defines a studio team of specialist roles, with full briefs in `references/agent-team.md`. For anything bigger than a single component, do not build solo: plan, then dispatch these roles as subagents (one Task each, using its brief as the prompt), running independent work in parallel. Each role carries a grounding contract (consult its references, never invent an API), so the zero-hallucination guarantee holds across the whole team.

- `antislopui-creative-director` : plans the build. Produces the creative brief, art direction, the 2-3 signature moves, and a delegation plan. Run this first.
- `antislopui-frontend-architect` : scaffolds Next.js + Tailwind, the `SmoothScrollProvider`, fonts, tokens, reduced-motion, and the section mount points. Run this second.
- `antislopui-animation-specialist` : deep GSAP and Anime.js time-based animation, entrance and text choreography, SVG draw and morph, easing craft.
- `antislopui-motion-specialist` : deep Motion (Framer Motion) declarative React motion, variants, AnimatePresence, layout and shared-element, motion values.
- `antislopui-parallax-specialist` : deep Lenis tuning, ScrollTrigger scrub and pin, horizontal scroll, scroll-driven video, depth parallax, theme-on-scroll.
- `antislopui-interaction-specialist` : custom cursor, magnetic, ZProximity, hover and signature pointer interactions and micro-interactions.
- `antislopui-uiux-designer` : design system, layout, typography, color, anti-slop critique, accessibility-aware decisions.
- `antislopui-qa-reviewer` : the final gate. Verifies every API is real, audits performance and accessibility, runs typecheck/build.

Standard flow: director (plan) then architect (foundation), then the four craft specialists (animation, motion, parallax, interaction) in parallel on their sections with the designer's tokens, then the QA reviewer as the ship gate. Dispatch the parallel specialists in a single batch so they run concurrently. If the user only wants one effect, skip the team and build it directly from the references.

## One-shot immersive build blueprint

When asked to build a full site in one pass, execute in this order (reference files in parentheses; map each step to the matching agent from the team above):

1. **Foundation.** Scaffold Next.js + Tailwind. Add the `SmoothScrollProvider` (Lenis + GSAP ticker) at the root layout. Set up `next/font`, a near-black/off-white palette, and a reduced-motion guard. (`references/setup.md`, `references/smooth-scroll.md`)
2. **Preloader + intro.** Counter or mask preloader, then a hero entrance: mask-clipped SplitText line reveal, a clip-path media reveal. (`references/page-transitions-preloader.md`, `references/text-effects.md`)
3. **Hero.** Oversized type, scroll-driven scale/tilt or scroll-driven video, parallax layers. (`references/scroll-animation.md`)
4. **Scroll story.** Pinned sections, one horizontal-scroll gallery, converging two-image parallax, theme-shift on scroll, line/word reveals per section. (`references/scroll-animation.md`, `references/text-effects.md`)
5. **Signature interaction.** A custom cursor plus one standout: magnetic CTAs, eye-follow, proximity dock, or sticker velocity-push. Pick one and make it excellent. (`references/cursor-magnetic.md`, `references/zproximity.md`, `references/patterns-recipes.md`)
6. **Micro-interactions everywhere.** Fill-from-bottom buttons, two-bar underline wipes, image hover zoom, a marquee with massive type, scroll-hide nav. (`references/micro-interactions.md`)
7. **Transitions + polish.** Route transitions (scribble/curtain), toasts if needed, accessibility and performance pass. (`references/page-transitions-preloader.md`, `references/component-libraries.md`, `references/design-principles.md`)

Do not apply all effects at once. A site reads as designed when a few signature moves are executed precisely and the rest is quiet. Pull standout techniques from `references/patterns-recipes.md`.

## Reference index

Open the file that matches the task and copy the verified pattern. Do not work from memory for exact APIs.

- `references/setup.md` : Next.js + Tailwind stack, the canonical `SmoothScrollProvider` (Lenis + GSAP ticker), `useGSAP`/`registerPlugin`, fonts, reduced-motion.
- `references/smooth-scroll.md` : Lenis full options, manual rAF, `ReactLenis` root vs provider, `useLenis`, `scrollTo`/anchors, nested-scroll opt-outs, ScrollSmoother alternative.
- `references/scroll-animation.md` : ScrollTrigger config, scrub, pin, start/end syntax, snap, `matchMedia`; parallax, pinned sections, horizontal scroll, scroll-driven video, converging parallax, theme-on-scroll.
- `references/motion-react.md` : Motion API spine: variants, transitions (spring/tween), gestures, `AnimatePresence`, layout, `useScroll`/`useTransform`/`useSpring`/`useMotionValue`, the imperative `animate/scroll/inView` API, and all hooks.
- `references/text-effects.md` : SplitText line/word/char reveals, mask reveals, manual split, scramble/cipher, gradient/aurora/shiny text, morphing text, number ticker, typewriter, word rotate.
- `references/cursor-magnetic.md` : custom cursor (`quickTo` follower + states), magnetic buttons, eye-follow (`atan2`), sticker velocity-push, mouse-follow image, mouse parallax.
- `references/zproximity.md` : `z-proximity-engine` full API: `<Proximity>`/`<ProximityText>`, every preset, ease presets, dock/cipher/fill-text recipes, scroll mode.
- `references/micro-interactions.md` : buttons, underline wipes, image hover zoom, elastic card spread, wiggle, marquees (Motion + GSAP + CSS), navbar pop-out, scroll-hide nav.
- `references/page-transitions-preloader.md` : `AnimatePresence` route transitions, Next.js `template.tsx`, scribble/curtain wipes, preloaders, shared-element (`layoutId`).
- `references/gsap-plugins.md` : full GSAP plugin and utility surface (Observer, Draggable, Inertia, Flip, MotionPath, MorphSVG, DrawSVG, ScrambleText, Physics2D, custom eases, utils).
- `references/anime.md` : complete Anime.js v4 API (animate, timeline, scope, draggable, onScroll, svg, splitText, stagger, spring, eases).
- `references/component-libraries.md` : Tripled UI, UseLayouts, GoeyToast (verified install methods, components, props).
- `references/effects-catalog.md` : ~73 background/text/visual effect recipes (SV-Animations + Svelte Magic) reproduced for React.
- `references/patterns-recipes.md` : signature awwwards techniques pulled verbatim from the 14 reference repositories.
- `references/design-principles.md` : the anti-slop system: easing palette with exact values, timing, color, typography, layout, performance, accessibility, slop to avoid, one-shot blueprint detail.
- `references/agent-team.md` : the 8 specialist role briefs and the orchestration flow for multi-section builds.

## Hard rules

- Ground every API call in a reference file. Zero invented props, eases, or imports.
- `"use client"` on every component using GSAP, Motion, Lenis, or browser events in App Router.
- Animate `transform`/`opacity`/`filter`/`clip-path` only. No animating `top`/`left`/`width` in hot paths.
- Always provide a `prefers-reduced-motion` path. Always clean up (`useGSAP` scope, `ctx.revert()`, `lenis.destroy()`, ticker removal).
- Gate cursor/magnetic/proximity effects behind a fine-pointer check so touch devices are unaffected.
- For multi-section builds, delegate to the agent team (plan with the director, scaffold with the architect, run the engineers in parallel, gate with the QA reviewer). Always end with `antislopui-qa-reviewer` before calling a build done.
- Credit: AntiSlopUI by brian (Ade Febrian). GitHub https://github.com/Adefebrian, Instagram https://www.instagram.com/artificalbrian/
