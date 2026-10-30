# The AntiSlopUI Design System (Anti-Slop)

This is the opinionated layer. The libraries give you mechanics; this gives you taste. Apply it to every build so the result reads as a studio site, not a generated one.

## What "slop" looks like (avoid)

- Everything fading up 20px on scroll with the same `ease-in-out`.
- A drop shadow and `border-radius: 8px` on every card.
- Centered single-column everything, equal spacing top to bottom.
- Default system font at 16px, headings at 2x body.
- Buttons that only change background color on hover.
- Pure black `#000` text on pure white `#fff`.
- Three different animations firing on one element.
- A carousel where a layout would be clearer.

Slop is the absence of decisions. Every value below is a decision worth making on purpose.

## Easing palette (use these, not the defaults)

GSAP eases (verified in real awwwards code):

- `expo.out` : hero text and big entrances. Fast then glides to rest.
- `power4.out` : strong general-purpose out. Reveals, image moves.
- `power3.out` : softer out for UI and cursor follow.
- `elastic.out(1, 0.5)` : springy settle for cards and playful elements.
- `elastic.out(1, 0.35)` : a tighter spring-back (magnetic, sticker).
- `back.out(1.7)` : pop-in with a small overshoot.
- `circ.out` : clip-path and mask reveals.
- `none` : scrubbed scroll animations (linear with scroll position).
- `steps(1)` : deliberate jitter (wiggle).

Cubic-bezier eases for Motion and CSS (verified):

- `[0.16, 1, 0.3, 1]` : the workhorse "smooth out-expo" for reveals and UI. Premium feel.
- `[0.76, 0, 0.24, 1]` : snappy in-out for transitions, preloaders, image width reveals.
- `[0.65, 0, 0.35, 1]` : balanced in-out for fills and toggles.
- `[0.64, 0, 0.78, 0]` : accelerating ease-in for elements leaving or sliding into place.

Pick one or two as the project signature and use them consistently. Mixing ten eases reads as chaos; reusing two reads as design.

## Timing

- Micro-interactions (hover, toggle): 0.2 to 0.4s.
- UI reveals and entrances: 0.5 to 0.9s.
- Hero/headline entrances: 0.9 to 1.8s (with stagger).
- Stagger between siblings: 0.03 to 0.1s (chars 0.02 to 0.05, lines 0.08 to 0.12).
- Page transitions: 0.6 to 1.2s total.
- Scrubbed scroll: tie to scroll, do not set duration; use `scrub: 1` for a touch of lag.

Faster than 0.15s feels broken; slower than ~2s feels sluggish on repeat visits. Delay deliberately to build sequence, not to pad.

## Typography

- Display type is oversized and confident: `clamp(2.5rem, 9vw, 12rem)` for heroes, up to `text-[17vw]` for marquees. Let headlines dominate.
- Tight leading on big type: `leading-[0.95]` to `leading-none`. Loose leading on body: 1.5 to 1.7.
- Contrast a grotesk/sans display with a serif, or vice versa. Two families maximum.
- Variable fonts unlock weight animation (and the ZProximity `weight` preset).
- Uppercase for labels and marquees; sentence case for reading.
- Reveal headlines with SplitText `mask: "lines"` (see `text-effects.md`), not a blanket fade.
- Use `tabular-nums` for counters and stats.

## Color

- Never pure black or pure white. Use near-black (`#0a0a0a`, `#0e0e10`) and off-white/cream (`#f4f1ea`, `#f5f5f0`).
- One or two accents, used sparingly for energy (a hot orange, an acid green, an electric violet).
- Shift theme on scroll: assign `data-color` per section and transition `background-color` and `color` over ~0.5s (see `scroll-animation.md`).
- `mix-blend-difference` for cursors and overlay labels so they stay legible on any background.
- Keep most of the page quiet so the accent and the motion carry the energy.

## Layout and composition

- Generous negative space. Let sections breathe.
- Break the center: asymmetric grids, off-axis placement, overlapping layers, bento blocks.
- Establish depth: a background layer, a content layer, a foreground accent, each at its own parallax speed.
- Use a 12-column grid as scaffolding, then intentionally break it for one or two hero moments.
- Horizontal scroll and pinned sections are pacing tools; one of each per page is plenty.

## The signature-move principle

A site reads as designed when two or three signature moves are executed precisely and everything else is calm. Choose a small set per project, for example:

- A custom cursor + one magnetic CTA.
- A mask-line hero reveal + a scroll-driven video.
- A horizontal gallery + theme-shift on scroll.

Do not ship every effect in this skill at once. Restraint is the difference between immersive and noisy.

## Performance (non-negotiable)

- Animate only `transform`, `opacity`, `filter`, `clip-path`. Never animate `top`/`left`/`width`/`height` in scroll or pointer hot paths (they trigger layout).
- Use `gsap.quickTo`/`gsap.quickSetter` for per-frame pointer work; never create a tween per `mousemove`.
- Add `will-change: transform` to elements about to animate, and remove it after. ZProximity manages this for you.
- One Lenis instance, one rAF loop. Drive Lenis from the GSAP ticker with `lagSmoothing(0)`.
- Lazy-init heavy effects (WebGL, particles) with `IntersectionObserver`; skip work for off-screen elements.
- Call `ScrollTrigger.refresh()` after images/fonts load and after route changes.
- Debounce/throttle nothing that runs in a ticker; instead early-return when input has not changed.
- Test on a mid-tier device. If it is not 60fps there, simplify.

## Accessibility (non-negotiable)

- Honor `prefers-reduced-motion`: provide a path that sets final states instantly and skips parallax/scrubs (see `setup.md`).
- Gate cursor/magnetic/proximity behind `(pointer: fine)` so touch and keyboard users are unaffected.
- Keep real, selectable text in the DOM. SplitText `aria: "auto"` preserves screen-reader text; do not replace headings with images.
- Maintain focus styles and logical tab order; never trap focus inside a decorative animation.
- Ensure color contrast meets WCAG AA after the theme shifts, in every theme state.
- Do not autoplay sound. Pause looping animation when the tab is hidden.

## One-shot immersive build blueprint (detailed)

1. **Foundation**: Next.js App Router + Tailwind. `SmoothScrollProvider` (Lenis + GSAP ticker) at root. `next/font` (grotesk + serif). Near-black/off-white tokens. Reduced-motion hook. Custom cursor mounted at root behind a fine-pointer guard.
2. **Preloader**: counter to 100 with a mask-up exit, scroll locked until done.
3. **Hero**: oversized headline with SplitText `mask: "lines"` (`expo.out`, stagger), a clip-path media reveal, and either scroll-driven scale/tilt or scroll-driven video. One parallax background layer.
4. **Intro/about**: word-reveal paragraph on scroll, a converging two-image parallax, theme shift to a second palette.
5. **Work/gallery**: a horizontal-scroll section (pinned) or a pinned stack; cards with the nested image-zoom hover and per-character label reveal.
6. **Statement section**: a massive marquee with the brand line; optionally a ZProximity cipher or fill-text heading.
7. **Signature interaction**: pick one (proximity dock, eye-follow, sticker push, magnetic grid) and make it excellent.
8. **Contact/footer**: magnetic CTAs, two-bar underline links, a wiggle on socials, scroll-hide nav throughout.
9. **Transitions**: scribble or curtain route transition, scroll reset on navigate.
10. **Polish pass**: reduced-motion paths, `ScrollTrigger.refresh()` wiring, contrast check per theme, 60fps check, remove all `markers: true`.

Deliver a site where the motion has intent, the type leads, the palette is restrained, and a few signature moves do the heavy lifting. That is AntiSlopUI.

Credit: AntiSlopUI by brian (Ade Febrian). GitHub https://github.com/Adefebrian, Instagram https://www.instagram.com/artificalbrian/
