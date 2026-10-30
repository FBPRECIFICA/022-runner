# Scroll Animation: GSAP ScrollTrigger

ScrollTrigger is the backbone for scroll-driven motion. Verified against the GSAP docs and real awwwards repos. Always inside a `"use client"` component, registered, and wrapped in `useGSAP` for cleanup.

## Config object (verified options)

```js
gsap.to(".box", {
  x: 500,
  scrollTrigger: {
    trigger: ".container",      // element or selector
    start: "top center",        // "triggerEdge scrollerEdge", default "top bottom"
    end: "bottom top",          // default "bottom top"; or "+=500"
    scrub: true,                // true | number (seconds of catch-up lag)
    pin: true,                  // boolean | element
    pinSpacing: true,           // default true
    markers: true,              // dev only, remove for prod
    toggleActions: "play none none reverse", // onEnter onLeave onEnterBack onLeaveBack
    snap: { snapTo: "labels", duration: { min: 0.2, max: 3 }, ease: "power1.inOut" },
    invalidateOnRefresh: true,  // recompute on resize
    containerAnimation: tween,  // for triggers inside a horizontal tween
    onUpdate: (self) => console.log(self.progress, self.direction),
    onEnter: (self) => {},
    onEnterBack: (self) => {},
  },
});
```

start/end syntax: keywords `top|center|bottom`, percentages `"80%"`, pixels `"100px"`, relative `"+=300"`, and `"clamp(top bottom)"` to keep scrubbed values from leaking past page bounds.

toggleActions values: `play pause resume reset restart complete reverse none`. Default `"play none none none"`. For reveal-once-but-replay-on-return use `"play none none reverse"`.

scrub vs toggleActions: use `scrub` to tie progress to the scrollbar (parallax, pin sequences, video). Use `toggleActions` for fire-and-forget entrance animations.

## Reveal on scroll (the non-slop way)

Do not fade everything 20px. Use mask-clipped line reveals (see `text-effects.md`) and meaningful directional/clip reveals. A clean clip-path media reveal:

```js
useGSAP(() => {
  gsap.fromTo(".hero-media",
    { clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }, // zero-width slit
    { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 1, ease: "circ.out",
      scrollTrigger: { trigger: ".hero-media", start: "top 80%" } });
}, { scope: container });
```

## Parallax (scrub)

```js
useGSAP(() => {
  gsap.to(".panel-image", {
    yPercent: -20, ease: "none",
    scrollTrigger: { trigger: ".panel", start: "top bottom", end: "bottom top", scrub: true },
  });
}, { scope: container });
```

Use `ease: "none"` for scrubbed parallax so motion is linear with scroll. Layer two or three elements at different `yPercent` for depth.

## Pinned section with a scrubbed timeline

```js
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: ".stage", start: "top top", end: "+=1500", scrub: 1, pin: true },
  });
  tl.from(".stage h2", { yPercent: 100, opacity: 0 })
    .to(".stage .bg", { scale: 1.2, ease: "none" }, 0)
    .to(".stage .fg", { yPercent: -40, ease: "none" }, 0);
}, { scope: container });
```

## Horizontal scroll gallery (verified pattern)

Tall outer container, sticky inner row, translate the row with `xPercent`. With 4 slides, move `-300` (3 widths). `scrub: 1` for a slight lag.

```jsx
// JSX
<section className="cont h-[400vh] relative">
  <div className="slides sticky top-0 h-screen overflow-hidden flex">
    <div className="slide w-screen h-screen shrink-0">1</div>
    {/* ...4 slides */}
  </div>
</section>
```

```js
useGSAP(() => {
  gsap.to(".slides", {
    xPercent: -300, ease: "none",
    scrollTrigger: { trigger: ".cont", start: "top top", end: "bottom bottom", scrub: 1 },
  });
}, { scope: container });
```

To pin and drive distance by content width instead:

```js
const row = rowRef.current;
gsap.to(row, {
  x: () => -(row.scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: { trigger: ".cont", pin: true, scrub: 1, end: () => "+=" + (row.scrollWidth - window.innerWidth), invalidateOnRefresh: true },
});
```

## Scroll-driven video (cinematic, verified)

Drive `video.currentTime` from a pinned ScrollTrigger so the footage plays as the user scrolls. Preload metadata and mute/playsInline for mobile.

```js
useGSAP(() => {
  const video = videoRef.current;
  const setup = () => {
    gsap.to(video, {
      currentTime: video.duration,
      ease: "none",
      scrollTrigger: { trigger: ".video-stage", start: "top top", end: "bottom bottom", scrub: true, pin: true },
    });
  };
  if (video.readyState >= 1) setup();
  else video.addEventListener("loadedmetadata", setup, { once: true });
}, { scope: container });
```

```jsx
<video ref={videoRef} src="/hero.mp4" muted playsInline preload="metadata" />
```

## Sticky video hero with content scrolling over it (verified)

A pure-CSS sticky alternative: a `sticky` video block with `pb-[100vh]` lets text and cards scroll across a held video. No JS.

```jsx
<div className="relative">
  <div className="sticky top-0 z-10 pb-[100vh]">
    <div className="h-screen"><video src="/hero.mp4" className="h-full w-full object-cover" muted playsInline /></div>
  </div>
  <div className="relative z-20">{/* hero text, cards scroll over the video */}</div>
</div>
```

## Hero scale/tilt on scroll (verified)

```js
useGSAP(() => {
  gsap.to(".hero", {
    rotate: 7, scale: 0.9, yPercent: 30, ease: "power1.inOut",
    scrollTrigger: { trigger: ".hero", start: "1% top", end: "bottom top", scrub: true },
  });
}, { scope: container });
```

## Theme shift on scroll (verified)

Set a `data-color` per section, swap a body attribute on enter, transition background in CSS.

```jsx
<section className="section" data-color="black">...</section>
```

```js
useGSAP(() => {
  gsap.utils.toArray<HTMLElement>(".section").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onEnter: () => document.body.setAttribute("data-theme", sec.dataset.color!),
      onEnterBack: () => document.body.setAttribute("data-theme", sec.dataset.color!),
    });
  });
}, { scope: container });
```

```css
body { transition: background-color 0.5s ease-out, color 0.5s ease-out; }
body[data-theme="black"] { background: #0a0a0a; color: #f4f1ea; }
body[data-theme="cream"] { background: #f4f1ea; color: #0a0a0a; }
```

## ScrollTrigger.batch (efficient list reveals)

For many cards, batch into grouped triggers instead of one per item.

```js
ScrollTrigger.batch(".card", {
  start: "top 85%",
  onEnter: (els) => gsap.from(els, { y: 60, opacity: 0, stagger: 0.12, ease: "power3.out", overwrite: true }),
});
```

## Responsive with matchMedia

```js
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    gsap.to(".slides", { xPercent: -300, ease: "none", scrollTrigger: { trigger: ".cont", scrub: 1, start: "top top", end: "bottom bottom" } });
  });
  mm.add("(max-width: 767px)", () => {
    // vertical fallback for the same content
  });
}, { scope: container });
```

## Refresh discipline

Call `ScrollTrigger.refresh()` after images/fonts load or layout changes; set `invalidateOnRefresh: true` on triggers whose `start/end` use functions. On route change in App Router, refresh after the new content mounts.

## Motion (Framer Motion) scroll alternative

For React-state-driven scroll work without GSAP, use Motion `useScroll` + `useTransform` (see `motion-react.md`). Converging two-image parallax, scroll progress bars, and per-section parallax read cleaner in Motion; scrubbed timelines, pinning, and video scrub are stronger in GSAP. Both can coexist in one project.
