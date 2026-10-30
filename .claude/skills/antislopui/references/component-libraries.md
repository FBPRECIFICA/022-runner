# Component Libraries: Tripled, UseLayouts, GoeyToast

Three copy-paste React libraries to pull structure and behavior from. Verified install methods and APIs. The anti-slop rule applies hard here: pull a component for its mechanics, then restyle it to the project palette, type, and easing. Shipping any of these with stock colors and timings is the fast path to generic.

## UI TripleD (ui.tripled.work)

Production-ready animated components, blocks, cards, and full pages. Stack: Next.js + React 19 + TypeScript + Tailwind + Framer Motion + shadcn/ui. Repo: github.com/moumen-soliman/uitripled. Author: Moumen Soliman.

Install via the shadcn registry CLI (verified on component pages):

```bash
npx shadcn@latest init                      # once
npm install framer-motion @radix-ui/react-icons
npx shadcn add @uitripled/<component-slug>   # e.g. native-magnetic, native-marquee, staggered-hero
```

Registry JSON base is `https://ui.tripled.work/r/<slug>.json`. Every component page also shows full source under "Manual Installation" for copy-paste. Note: components import from `framer-motion` (the older package name); if your project uses `motion`, either alias or change the import to `motion/react` (the API is identical).

Catalog (about 138 items): Native Components (29), Blocks (36), Cards (14), Components (32), Page Transitions (11), Decorative (8), Resumes (4), Data Animations, Forms, Microinteractions. High-value slugs for awwwards work: `native-magnetic`, `native-marquee`, `native-flip-text`, `native-liquid-button`, `native-notch` (dynamic island), `staggered-hero`, `scroll-reveal`, `dynamic-spotlight-cta`, `liquid-cursor`, `bento-grid-block`, `glowy-waves-hero`.

Verified component shapes (real source):

```tsx
// native-magnetic: useMotionValue/useSpring/useTransform on cursor offset from center
<NativeMagnetic strength={0.3} stiffness={300} damping={30} as="a" href="#">
  <Button>Magnetic</Button>
</NativeMagnetic>
// props: strength(0-1, def 0.3), stiffness(300), damping(30), scaleOnHover(true), as("div"|"button"|"a")

// native-marquee: useAnimate, two tracks 0% -> -100%, duration = 100/speed; ships SideFadeGradients + useMarquee
<NativeMarquee items={ITEMS} speed={10} gap={8} reverse pauseOnHover isVertical={false} />

// native-flip-text: AnimatePresence mode="wait", rotateX -90 -> 0 -> 90 + blur filter, spring
<NativeFlipText words={["design","motion","systems"]} duration={2000} />
```

These confirm Tripled is genuinely Motion-based and restyleable. Reuse the mechanics (the magnetic spring math, the marquee tandem-track loop, the flip-text AnimatePresence), then apply your own type and color.

## UseLayouts (uselayouts.com)

Premium layout components and micro-interactions. Stack: Motion (the `motion` package) + Tailwind CSS 4 + React 19. Free and open source. Creator: Urvish Mali.

Install via shadcn JSON URL per component (verified):

```bash
npm install motion clsx tailwind-merge @hugeicons/react @hugeicons/core-free-icons
# lib/utils.ts -> cn() helper (clsx + tailwind-merge), see setup.md
npx shadcn@latest add "https://uselayouts.com/r/<slug>.json"   # e.g. 3d-book, morphing-input
```

26 components. High-value: `feature-carousel`, `magnified-bento`, `morphing-input`, `multi-step-form`, `vertical-tabs`, `dynamic-toolbar`, `expandable-gallery`, `stacked-list`, `fluid-expanding-grid`, `3d-book`, `pricing-card`, `shake-testimonial-card`. The intro highlights "direction-aware tabs and magnetic buttons" plus hero sections and testimonial sliders. Components import from `motion`, which is the package this skill standardizes on, so they drop in cleanly.

## GoeyToast (goey-toast.vercel.app)

Morphing "gooey" toast notifications with blob physics and promise tracking. Package `goey-toast` (v0.4.0). Peer dependency is `framer-motion` (not `motion`); verify on install if the project uses `motion`.

```bash
npm install goey-toast
# or: npx shadcn@latest add https://goey-toast.vercel.app/r/goey-toaster.json
```

```tsx
import { GooeyToaster, gooeyToast } from "goey-toast";

<GooeyToaster position="bottom-right" theme="dark" preset="bouncy" bounce={0.4} swipeToDismiss showProgress={false} />;

gooeyToast.success("Saved");
gooeyToast.error("Payment failed", {
  description: "Your card was declined.",
  action: { label: "Retry", onClick: () => retry(), successLabel: "Done" },
  fillColor: "#1a1a2e", borderColor: "#333", duration: 6000, preset: "snappy",
});
const id = gooeyToast.success("Uploading...");
gooeyToast.update(id, { title: "Upload complete", type: "success", description: "Synced." });
gooeyToast.promise(save(), { loading: "Saving...", success: "Saved", error: "Failed" });
gooeyToast.dismiss({ type: ["error", "warning"] });   // dismiss by filter, id, or all
```

`<GooeyToaster>` props (verified): `position` (6 anchors), `theme` ("light"|"dark"), `spring`, `bounce` (0.05-0.8), `gap`, `offset`, `closeOnEscape`, `showProgress`, `maxQueue`, `queueOverflow` ("drop-oldest"|"drop-newest"), `swipeToDismiss`, `preset` ("smooth"|"bouncy"|"subtle"|"snappy"). Per-toast options: `description, action {label,onClick,successLabel}, icon, duration, id, fillColor, borderColor, borderWidth, spring, bounce, showProgress, preset, classNames {...}, timing, onDismiss, onAutoClose`. Methods: `gooeyToast() / .success / .error / .warning / .info / .promise / .dismiss / .update`.

## Using these without producing slop

Treat all three as source you own. Pull a component, then: replace the palette with the project tokens, swap the easing to the project signature (see design-principles.md), match the type scale, and remove anything decorative that does not earn its place. A library component shipped unchanged is recognizable and generic; the same mechanics restyled to the brand reads as bespoke. For toasts specifically, only fire them on real state changes (save, error, copy), never as ambient decoration.
