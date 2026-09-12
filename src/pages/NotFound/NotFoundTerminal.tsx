import { useEffect, useRef } from 'react';
import styles from './NotFound.module.scss';

/**
 * NotFoundTerminal — flickering grid plus scanline for the 404 terminal state.
 *
 * A matrix of silver cells blinking at whisper alpha over obsidian, a
 * scanline sweeping top to bottom, and a cursor ignition zone flashing hot
 * white near the pointer. Performance: 2D canvas with alpha over the static
 * CSS dot field, low-res backing with DPR capped at 1, sparse painting with
 * quantized alpha buckets, an adaptive 60→30fps budget, off-screen and
 * hidden-tab pausing, zero React re-renders in the loop, and pointer tracking
 * gated on fine pointers. Reduced motion renders one settled dim frame.
 */

const RENDER_SCALE = 0.5;
const CELL_CSS = 26;
const IGNITE_CSS = 150;

const STYLES = [
  'rgba(185, 189, 199, 0.05)',
  'rgba(185, 189, 199, 0.11)',
  'rgba(232, 234, 237, 0.22)',
  'rgba(255, 255, 255, 0.5)',
] as const;

/** Fast deterministic hash for flicker phases — no allocation, no Math.random. */
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 974634211) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967296;
}

/**
 * Renders the terminal error-field canvas.
 *
 * @returns {JSX.Element} The canvas host element.
 */
export default function NotFoundTerminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let calm: boolean;
    try {
      calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      calm = false;
    }

    let finePointer: boolean;
    try {
      finePointer = window.matchMedia('(pointer: fine)').matches;
    } catch {
      finePointer = false;
    }

    let raf = 0;
    let running = true;
    let visible = true;
    let cols = 0;
    let rows = 0;
    let cell = 13;
    let cursorX = -9999;
    let cursorY = -9999;
    let hasPointer = false;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));
      canvas.width = Math.max(2, Math.round(cssW * RENDER_SCALE));
      canvas.height = Math.max(2, Math.round(cssH * RENDER_SCALE));
      cell = Math.max(8, CELL_CSS * RENDER_SCALE);
      cols = Math.ceil(canvas.width / cell) + 1;
      rows = Math.ceil(canvas.height / cell) + 1;
    };

    const paint = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const ignite = IGNITE_CSS * RENDER_SCALE;
      const igniteSq = ignite * ignite;
      const half = cell / 2;
      const ox = cell / 2;
      const oy = cell / 2;
      const tick = Math.floor(t * 9);

      ctx.fillStyle = STYLES[0];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const f = hash2(gx, gy, tick);
          if (f < 0.93) continue;
          ctx.fillStyle = f > 0.978 ? STYLES[1] : STYLES[0];
          const px = gx * cell + ox;
          const py = gy * cell + oy;
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
      }

      if (hasPointer && finePointer) {
        for (let gy = 0; gy < rows; gy++) {
          for (let gx = 0; gx < cols; gx++) {
            const px = gx * cell + ox + half;
            const py = gy * cell + oy + half;
            const dx = px - cursorX;
            const dy = py - cursorY;
            const d2 = dx * dx + dy * dy;
            if (d2 > igniteSq) continue;
            const heat = 1 - Math.sqrt(d2) / ignite;
            const bucket = heat > 0.66 ? 3 : 2;
            ctx.fillStyle = STYLES[bucket] ?? STYLES[2];
            const s = 3 + heat * 5;
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
          }
        }

        const glow = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, ignite);
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cursorX - ignite, cursorY - ignite, ignite * 2, ignite * 2);
      }

      const span = h + 120;
      const sy = ((t * 90) % span) - 60;
      const scan = ctx.createLinearGradient(0, sy - 26, 0, sy + 26);
      scan.addColorStop(0, 'rgba(232, 234, 237, 0)');
      scan.addColorStop(0.5, 'rgba(232, 234, 237, 0.055)');
      scan.addColorStop(1, 'rgba(232, 234, 237, 0)');
      ctx.fillStyle = scan;
      ctx.fillRect(0, sy - 26, w, 52);
    };

    const startLoop = () => {
      if (raf || !running) return;
      last = performance.now();
      accumulator = 0;
      raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let last = performance.now();
    let accumulator = 0;
    let budget = 1000 / 60;
    let emaDraw = 3;

    const loop = () => {
      raf = 0;
      if (!running || !visible || document.hidden) return;
      const now = performance.now();
      accumulator += now - last;
      last = now;
      if (accumulator >= budget) {
        const before = performance.now();
        paint(now / 1000);
        emaDraw += (performance.now() - before - emaDraw) * 0.12;
        if (emaDraw > 11 && budget < 32) budget = 1000 / 30;
        else if (emaDraw < 6 && budget > 17) budget = 1000 / 60;
        accumulator = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    resize();

    if (calm) {
      hasPointer = false;
      paint(0.4);
      return undefined;
    }
    startLoop();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(host);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && running && !raf) startLoop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const toBacking = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      if (
        clientX < rect.left - 60 ||
        clientX > rect.right + 60 ||
        clientY < rect.top - 60 ||
        clientY > rect.bottom + 60
      ) {
        return false;
      }
      cursorX = ((clientX - rect.left) / rect.width) * canvas.width;
      cursorY = ((clientY - rect.top) / rect.height) * canvas.height;
      return true;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer) return;
      hasPointer = toBacking(event.clientX, event.clientY);
    };

    const onPointerLeave = () => {
      hasPointer = false;
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
    </div>
  );
}
