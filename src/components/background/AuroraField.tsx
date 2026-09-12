import { useEffect, useRef } from 'react';
import styles from './AuroraField.module.scss';

/**
 * AuroraField — interactive canvas aurora for the Home hero.
 *
 * Three layers in a single low-res 2D canvas pass: drifting radial aurora
 * washes with cursor parallax (three blobs on desktop, two on mobile),
 * a cursor glow that fades in on first move and out when the pointer leaves,
 * and a drifting particle network with proximity and cursor links that runs
 * continuously for every visitor from the first frame.
 *
 * Performance budget: 2D canvas only with the backing store near half CSS
 * size and DPR capped at 1 so the browser upscale acts as a free blur; one
 * paint per frame with batched strokes and quantized link styles; an adaptive
 * frame budget settling between 60fps and 30fps by measured draw cost; zero
 * React re-renders during the loop with pointer tracking gated on fine
 * pointers; off-screen and hidden-tab pausing. OffscreenCanvas was evaluated
 * and rejected: worker transfer exceeds the win at this fill count.
 *
 * Motion contract: the loop runs continuously for every visitor with no
 * reduced-motion branch; pausing below is pure frame-budget savings.
 */

interface Blob {
  readonly color: string;
  readonly alpha: number;
  readonly radiusRatio: number;
  readonly cxRatio: number;
  readonly cyRatio: number;
  readonly axRatio: number;
  readonly ayRatio: number;
  readonly speed: number;
  readonly phase: number;
  /** Parallax depth: how strongly this blob follows the cursor. */
  readonly depth: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const BLOBS_DESKTOP: readonly Blob[] = [
  {
    color: '#ffffff',
    alpha: 0.07,
    radiusRatio: 0.42,
    cxRatio: 0.28,
    cyRatio: 0.34,
    axRatio: 0.09,
    ayRatio: 0.07,
    speed: 0.11,
    phase: 0,
    depth: 0.55,
  },
  {
    color: '#b9bdc7',
    alpha: 0.08,
    radiusRatio: 0.38,
    cxRatio: 0.74,
    cyRatio: 0.3,
    axRatio: 0.08,
    ayRatio: 0.09,
    speed: 0.09,
    phase: 2.1,
    depth: 0.9,
  },
  {
    color: '#6e7480',
    alpha: 0.1,
    radiusRatio: 0.4,
    cxRatio: 0.52,
    cyRatio: 0.72,
    axRatio: 0.1,
    ayRatio: 0.06,
    speed: 0.08,
    phase: 4.2,
    depth: 1.25,
  },
];

const BLOBS_MOBILE: readonly Blob[] = [
  {
    color: '#ffffff',
    alpha: 0.07,
    radiusRatio: 0.5,
    cxRatio: 0.3,
    cyRatio: 0.36,
    axRatio: 0.08,
    ayRatio: 0.06,
    speed: 0.11,
    phase: 0,
    depth: 0.6,
  },
  {
    color: '#6e7480',
    alpha: 0.09,
    radiusRatio: 0.46,
    cxRatio: 0.7,
    cyRatio: 0.7,
    axRatio: 0.08,
    ayRatio: 0.06,
    speed: 0.08,
    phase: 2.4,
    depth: 1.1,
  },
];

const RENDER_SCALE = 0.45;
const BASE_BG = '#0a0a0b';
const CURSOR_GLOW_COLOR = '#ffffff';
const CURSOR_GLOW_ALPHA = 0.08;

const PARTICLES_DESKTOP = 64;
const PARTICLES_MOBILE = 26;

/** Deterministic 0..1 hash — stable static frame, stable first paint. */
function hash01(index: number, salt: number): number {
  const s = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Cached `#rrggbb` parse so the loop never re-parses color strings. */
const rgbCache = new Map<string, readonly [number, number, number]>();

function rgba(hex: string, alpha: number): string {
  let rgb = rgbCache.get(hex);
  if (!rgb) {
    rgb = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ] as const;
    rgbCache.set(hex, rgb);
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Prebuilt quantized link styles — no per-line string allocation. */
const LINK_STYLES = [
  'rgba(185, 189, 199, 0.05)',
  'rgba(185, 189, 199, 0.11)',
  'rgba(185, 189, 199, 0.18)',
  'rgba(185, 189, 199, 0.26)',
];
const CURSOR_LINK_STYLES = [
  'rgba(255, 255, 255, 0.06)',
  'rgba(255, 255, 255, 0.14)',
  'rgba(255, 255, 255, 0.24)',
  'rgba(255, 255, 255, 0.36)',
];

/**
 * Renders the interactive aurora canvas field.
 *
 * @returns {JSX.Element} The canvas host element.
 */
export default function AuroraField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let visible = true;
    let blobs: readonly Blob[] = BLOBS_DESKTOP;
    let particles: Particle[] = [];
    let linkDist = 60;
    let cursorLinkDist = 110;

    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let glow = 0;
    let hasPointer = false;

    let finePointer = false;
    try {
      finePointer = window.matchMedia('(pointer: fine)').matches;
    } catch {
      finePointer = false;
    }

    const seedParticles = (count: number) => {
      particles = Array.from({ length: count }, (_, i) => ({
        x: hash01(i, 1),
        y: hash01(i, 2),
        vx: (hash01(i, 3) - 0.5) * 0.035,
        vy: (hash01(i, 4) - 0.5) * 0.035,
        r: 0.7 + hash01(i, 5) * 1.1,
      }));
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));
      const mobile = cssW < 700;
      blobs = mobile ? BLOBS_MOBILE : BLOBS_DESKTOP;
      const width = Math.max(2, Math.round(cssW * RENDER_SCALE));
      const height = Math.max(2, Math.round(cssH * RENDER_SCALE));
      canvas.width = width;
      canvas.height = height;
      const minDim = Math.min(width, height);
      linkDist = Math.max(28, minDim * 0.115);
      cursorLinkDist = Math.max(52, minDim * 0.21);
      const want = mobile ? PARTICLES_MOBILE : PARTICLES_DESKTOP;
      if (particles.length !== want) seedParticles(want);
    };

    const drawBlobs = (t: number, minDim: number, w: number, h: number) => {
      for (const blob of blobs) {
        const driftX = Math.sin(t * blob.speed + blob.phase) * blob.axRatio;
        const driftY = Math.cos(t * blob.speed * 1.15 + blob.phase) * blob.ayRatio;
        const paraX = smoothX * 0.14 * blob.depth;
        const paraY = smoothY * 0.14 * blob.depth;
        const x = (blob.cxRatio + driftX + paraX) * w;
        const y = (blob.cyRatio + driftY + paraY) * h;
        const r = blob.radiusRatio * minDim * 1.6;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, rgba(blob.color, blob.alpha));
        gradient.addColorStop(1, rgba(blob.color, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    const drawCursorGlow = (minDim: number, w: number, h: number) => {
      if (glow < 0.01) return;
      const x = (0.5 + smoothX) * w;
      const y = (0.5 + smoothY) * h;
      const r = minDim * 0.26;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, rgba(CURSOR_GLOW_COLOR, CURSOR_GLOW_ALPHA * glow));
      gradient.addColorStop(1, rgba(CURSOR_GLOW_COLOR, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const stepParticles = (dt: number) => {
      const ease = Math.min(1, dt * 3.4);
      smoothX += (targetX - smoothX) * ease;
      smoothY += (targetY - smoothY) * ease;
      const glowTarget = hasPointer && finePointer ? 1 : 0;
      glow += (glowTarget - glow) * Math.min(1, dt * 2.4);

      const pull = 0.16 * glow;
      for (const p of particles) {
        if (pull > 0.005) {
          const dx = 0.5 + smoothX - p.x;
          const dy = 0.5 + smoothY - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.06 && d2 > 0.00001) {
            const d = Math.sqrt(d2);
            const force = ((0.06 - d2) / 0.06) * pull * dt;
            p.x += (dx / d) * force * 0.4;
            p.y += (dy / d) * force * 0.4;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -0.02) p.x += 1.04;
        else if (p.x > 1.02) p.x -= 1.04;
        if (p.y < -0.02) p.y += 1.04;
        else if (p.y > 1.02) p.y -= 1.04;
      }
    };

    const drawNetwork = (w: number, h: number) => {
      const n = particles.length;
      if (n === 0) return;
      const linkSq = linkDist * linkDist;
      const cursorSq = cursorLinkDist * cursorLinkDist;
      const cx = (0.5 + smoothX) * w;
      const cy = (0.5 + smoothY) * h;

      ctx.lineWidth = 1;

      for (let i = 0; i < n; i++) {
        const a = particles[i];
        if (!a) continue;
        const ax = a.x * w;
        const ay = a.y * h;
        for (let j = i + 1; j < n; j++) {
          const b = particles[j];
          if (!b) continue;
          const dx = ax - b.x * w;
          const dy = ay - b.y * h;
          const d2 = dx * dx + dy * dy;
          if (d2 > linkSq || d2 < 0.01) continue;
          const d = Math.sqrt(d2);
          const bucket = Math.min(3, Math.floor(((1 - d / linkDist) * 4)));
          ctx.strokeStyle = LINK_STYLES[bucket] ?? LINK_STYLES[0];
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        }
      }

      if (glow > 0.03) {
        for (const p of particles) {
          const px = p.x * w;
          const py = p.y * h;
          const dx = px - cx;
          const dy = py - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > cursorSq || d2 < 0.01) continue;
          const d = Math.sqrt(d2);
          const bucket = Math.min(3, Math.floor(((1 - d / cursorLinkDist) * 4)));
          ctx.strokeStyle = CURSOR_LINK_STYLES[bucket] ?? CURSOR_LINK_STYLES[0];
          ctx.globalAlpha = glow;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'rgba(232, 234, 237, 0.5)';
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x * w + p.r, p.y * h);
        ctx.arc(p.x * w, p.y * h, p.r, 0, 6.2832);
      }
      ctx.fill();
    };

    const paint = (t: number, dt: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const minDim = Math.min(w, h);
      stepParticles(dt);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = BASE_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      drawBlobs(t, minDim, w, h);
      drawCursorGlow(minDim, w, h);
      drawNetwork(w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    };

    const startLoop = () => {
      if (raf || !running) return;
      last = performance.now();
      prevDraw = last;
      accumulator = 0;
      raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let last = performance.now();
    let prevDraw = last;
    let accumulator = 0;
    let budget = 1000 / 60;
    let emaDraw = 4;

    const loop = () => {
      raf = 0;
      if (!running || !visible || document.hidden) return;
      const now = performance.now();
      accumulator += now - last;
      last = now;
      if (accumulator >= budget) {
        const dt = Math.min(0.05, Math.max(0.001, (now - prevDraw) / 1000));
        prevDraw = now;
        const before = performance.now();
        paint(now / 1000, dt);
        const cost = performance.now() - before;
        emaDraw += (cost - emaDraw) * 0.12;
        if (emaDraw > 11 && budget < 32) budget = 1000 / 30;
        else if (emaDraw < 6 && budget > 17) budget = 1000 / 60;
        accumulator = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    startLoop();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(host);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && running && !raf) startLoop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer) return;
      const rect = host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      if (
        event.clientX < rect.left - 80 ||
        event.clientX > rect.right + 80 ||
        event.clientY < rect.top - 80 ||
        event.clientY > rect.bottom + 80
      ) {
        hasPointer = false;
        targetX = 0;
        targetY = 0;
        return;
      }
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
      hasPointer = true;
    };

    const onPointerLeave = () => {
      hasPointer = false;
      targetX = 0;
      targetY = 0;
    };

    const onVisibility = () => {
      if (!document.hidden && running && visible && !raf) startLoop();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);

    return () => {
      running = false;
      stopLoop();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
