"use client";
import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; life: number; maxLife: number; v: number; hue: number; alpha: number };
type Pole = { x: number; y: number; q: number };

/**
 * Animated dipole field-line background. Particles trace the field between two
 * poles and fade into a trail; the pointer acts as a weak third repulsor.
 * Honours prefers-reduced-motion by painting a single static frame.
 */
export function MagneticField({
  theme = "dark",
  density = 220,
  speed = 1,
  className,
}: {
  theme?: "dark" | "light";
  density?: number;
  speed?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const light = theme === "light";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 1;
    let h = 1;
    let poles: Pole[] = [];
    let particles: Particle[] = [];
    let mouse: { x: number; y: number; life: number } | null = null;
    let raf = 0;

    const spawn = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      life: 40 + Math.random() * 160,
      maxLife: 200,
      v: 0.4 + Math.random() * 0.9,
      hue: 240, // neutral — the field is monochrome
      alpha: 0.15 + Math.random() * 0.5,
    });

    const seed = () => {
      const n = Math.round(density * Math.min(1.4, Math.max(0.5, (w * h) / (1280 * 720))));
      particles = Array.from({ length: n }, spawn);
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      poles = [
        { x: w * 0.28, y: h * 0.42, q: +1 },
        { x: w * 0.74, y: h * 0.62, q: -1 },
      ];
      seed();
    };

    const field = (x: number, y: number) => {
      let fx = 0;
      let fy = 0;
      for (const p of poles) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d2 = Math.max(dx * dx + dy * dy, 400);
        const inv = p.q / (d2 * Math.sqrt(d2));
        fx += dx * inv;
        fy += dy * inv;
      }
      if (mouse && mouse.life > 0) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const d2 = Math.max(dx * dx + dy * dy, 900);
        const inv = 1.6 / (d2 * Math.sqrt(d2));
        fx += dx * inv;
        fy += dy * inv;
      }
      const m = Math.hypot(fx, fy) || 1;
      return { x: fx / m, y: fy / m };
    };

    const step = () => {
      if (mouse) mouse.life--;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = light ? "rgba(250,250,250,0.085)" : "rgba(10,10,11,0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";

      for (const p of particles) {
        const f = field(p.x, p.y);
        const nx = p.x + f.x * p.v * speed * 1.8;
        const ny = p.y + f.y * p.v * speed * 1.8;
        const a = p.alpha * Math.min(1, p.life / 40) * Math.min(1, (p.maxLife - p.life) / 30 + 0.2);
        ctx.strokeStyle = light ? `hsla(${p.hue}, 6%, 34%, ${a * 0.42})` : `hsla(${p.hue}, 8%, 82%, ${a * 0.9})`;
        ctx.lineWidth = light ? 1 : 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
        p.life -= 1;
        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          Object.assign(p, spawn());
          p.life = p.maxLife * (0.4 + Math.random() * 0.6);
        }
      }

      for (const pole of poles) {
        const g = ctx.createRadialGradient(pole.x, pole.y, 0, pole.x, pole.y, 110);
        g.addColorStop(0, light ? "hsla(240,6%,45%,0.06)" : "hsla(240,8%,88%,0.14)");
        g.addColorStop(1, "hsla(240,8%,80%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pole.x, pole.y, 110, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };

    const onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top, life: 60 };
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (reduced) {
      // Settle the field over a few dozen steps, then leave it as a still image.
      for (let i = 0; i < 40; i++) step();
    } else {
      host.addEventListener("pointermove", onPointerMove);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
    };
  }, [theme, density, speed]);

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}
