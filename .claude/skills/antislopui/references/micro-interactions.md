# Micro-interactions

The small details that make a site feel finished: buttons, underlines, hover states, marquees, nav. All verified from real awwwards repos. These are mostly CSS or light Motion, which keeps them cheap and everywhere.

## Buttons

Fill-from-bottom (CSS only, verified). A span grows from `h-0` to `h-full` on hover; the label flips color over it.

```tsx
<button className="group relative overflow-hidden rounded-full border border-current px-6 py-3">
  <span className="relative z-10 uppercase transition-colors duration-300 group-hover:text-black">Explore</span>
  <span className="absolute inset-x-0 bottom-0 z-0 h-0 bg-white transition-all duration-300 ease-in-out group-hover:h-full" />
</button>
```

Label slide-and-fade (verified). The label slides up out of view and a duplicate slides in, with an icon rotating 45deg.

```css
.btn:hover .label { animation: slideFade 0.4s forwards; }
.btn:hover .icon { transform: rotate(45deg); transition: transform 0.5s ease-in-out; }
@keyframes slideFade {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-100%); opacity: 0; }
  51% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

Arrow circle fill (Motion, verified). A circle scales from 0 to 1 behind an arrow on hover.

```tsx
<div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-current">
  <motion.span className="absolute inset-0 rounded-full bg-white" initial={{ scale: 0 }} animate={{ scale: hover ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }} />
  <ArrowUpRight className={`relative z-10 ${hover ? "text-black" : "text-white"}`} />
</div>
```

Mix-blend fill (verified). Toggle `backgroundColor` and keep the label on `mix-blend-difference` so it stays legible against the fill.

```tsx
<motion.div animate={{ backgroundColor: hover ? "#fff" : "rgba(255,255,255,0)" }} transition={{ duration: 0.6 }} className="rounded-full border border-current px-5 py-2">
  <span className="mix-blend-difference">Contact</span>
</motion.div>
```

Shimmer (CSS): a `::after` gradient `linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)` with `background-size: 200%` animates `background-position` on hover.

For magnetic buttons, see `cursor-magnetic.md`.

## Two-bar underline wipe (verified)

On hover, the existing underline wipes out to the right, then a new one wipes in from the left. Two absolutely positioned `scaleX` bars with offset timing.

```tsx
const wipe = {
  out:   { initial: { scaleX: 1, originX: 1 }, hover: { scaleX: 0, originX: 1, transition: { duration: 0.3 } } },
  in:    { initial: { scaleX: 0, originX: 0 }, hover: { scaleX: 1, originX: 0, transition: { delay: 0.3, duration: 0.3 } } },
};
<motion.a className="relative" initial="initial" whileHover="hover">
  Link label
  <motion.span className="absolute bottom-0 left-0 h-px w-full bg-current" variants={wipe.out} />
  <motion.span className="absolute bottom-0 left-0 h-px w-full bg-current" variants={wipe.in} />
</motion.a>
```

## Image hover zoom (verified nested-scale)

Outer container shrinks to `0.95` while the inner image grows to `1.08`. The frame contracts as the image pushes in, a refined "zoom out to zoom in" feel.

```tsx
const controls = useAnimation(); // onMouseEnter: start("hover"); onMouseLeave: start("rest")
<motion.div className="overflow-hidden rounded-2xl" variants={{ rest: { scale: 1 }, hover: { scale: 0.95 } }} initial="rest" animate={controls} transition={{ duration: 0.8, ease: "easeInOut" }}>
  <motion.div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: "url(/work.jpg)" }} variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }} transition={{ duration: 0.8, ease: "easeInOut" }} />
</motion.div>
```

Inline image reveal between headline lines (verified): a `motion.div` animates `width` from `0` to `"9vw"` with `ease: [0.76, 0, 0.24, 1]`, pushing the words apart as it appears.

## Marquee (three approaches)

Motion (verified ochi pattern): duplicate the content, animate `x` to `-100%` linearly, repeat forever. Massive type (`text-[17vw]`) sells it.

```tsx
<div className="flex overflow-hidden whitespace-nowrap">
  {[0, 1, 2].map((i) => (
    <motion.span key={i} initial={{ x: 0 }} animate={{ x: "-100%" }} transition={{ ease: "linear", duration: 12, repeat: Infinity }} className="px-8 text-[12vw] uppercase leading-none">
      we are antislopui&nbsp;
    </motion.span>
  ))}
</div>
```

GSAP infinite (seamless, modulo wrap): better when you want hover-pause and velocity reactivity.

```js
const loop = gsap.to(".marquee-track", { xPercent: -50, repeat: -1, duration: 16, ease: "none" });
track.addEventListener("mouseenter", () => gsap.to(loop, { timeScale: 0, duration: 0.4 }));
track.addEventListener("mouseleave", () => gsap.to(loop, { timeScale: 1, duration: 0.4 }));
// duplicate the track content once so -50% wraps seamlessly
```

CSS only: duplicate content, `@keyframes marquee { to { transform: translateX(-50%); } }`, `animation-play-state: paused` on hover. Use when no JS is wanted.

Velocity-reactive bonus: read `lenis.velocity` and set `loop.timeScale()` or a `skewX` so the marquee leans with scroll speed.

## Scroll-direction nav hide (verified Motion)

Hide the nav when scrolling down, reveal when scrolling up.

```tsx
const { scrollY } = useScroll();
const [hidden, setHidden] = useState(false);
useMotionValueEvent(scrollY, "change", (y) => setHidden(y > (scrollY.getPrevious() ?? 0) && y > 100));
<motion.nav variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }} animate={hidden ? "hidden" : "visible"} transition={{ duration: 0.35, ease: "easeInOut" }} className="fixed inset-x-0 top-0 z-50" />
```

## Elastic card spread (verified)

A fan of tilted cards. On hovering one, it flattens and scales up while neighbors push outward along their own tilt axis. All springs use `elastic.out(1, 0.5)`.

```js
const base = [4, -5, 5, -8, 5]; // resting rotations in degrees
// hovered card:
gsap.to(cards[i], { x: 0, y: -20, rotation: 0, scale: 1.08, duration: 0.9, ease: "elastic.out(1, 0.5)", overwrite: true });
// each neighbor: push by horizontal gap, then follow its tilt axis with targetY = targetX * tan(rotation)
const targetX = Math.max(neighborGapPx, 10);
const targetY = targetX * Math.tan(base[j] * Math.PI / 180);
gsap.to(cards[j], { x: dir * targetX, y: targetY, rotation: base[j], scale: 1, duration: 1, ease: "elastic.out(1, 0.5)", overwrite: true });
```

Mobile fallback (verified): a ScrollTrigger-pinned stack where cards fly up from `y: innerHeight * 1.1` as the section scrolls.

## Wiggle utility (verified)

Snappy frame-by-frame jitter using `ease: "steps(1)"`, not smooth oscillation. Centralize intensities in one config object.

```js
function wiggle(el, intensity = 4) {
  let tween;
  el.addEventListener("mouseenter", () => { tween = gsap.to(el, { rotation: intensity, duration: 0.17, repeat: -1, yoyo: true, ease: "steps(1)" }); });
  el.addEventListener("mouseleave", () => { tween?.kill(); gsap.to(el, { rotation: 0, duration: 0.3, ease: "power2.out" }); });
}
```

## Navbar pop-out menu (verified)

Measure the trigger icon center, set it as `transformOrigin`, then scale the panel up from the icon while items stagger in.

```js
const b = blob.getBoundingClientRect(), box = panel.getBoundingClientRect();
gsap.set(panel, { transformOrigin: `${b.left + b.width/2 - box.left}px ${b.top + b.height/2 - box.top}px` });
gsap.fromTo(panel, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "expo.out" });
gsap.to(items, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power3.out", delay: 0.18 });
```

## Discipline

- Micro-interactions should be quick (0.2 to 0.6s) and consistent in easing across the site.
- Reuse one button component and one link component everywhere; consistency reads as design intent.
- Do not stack three hover effects on one element. One clear response per interaction.
