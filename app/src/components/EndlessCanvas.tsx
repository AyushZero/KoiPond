import { useEffect, useRef, useCallback } from "react";

interface EndlessCanvasProps {
  active: boolean;
  mode: "dark" | "light";
  showKoi: boolean;
}

/* ─── Types ──────────────────────────────────────────────────────── */

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Cloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
  speed: number;
  alpha: number;
}

interface Koi {
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  phase: number;
  phaseSpeed: number;
  turnTimer: number;
  turnTarget: number;
}

interface DragonSegment {
  x: number;
  y: number;
}

interface Dragon {
  segments: DragonSegment[];
  headX: number;
  headY: number;
  speed: number;
  phase: number;
  alive: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function createStars(w: number, h: number): Star[] {
  const count = Math.floor(rand(50, 80));
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: rand(0.5, 1.5),
    baseAlpha: rand(0.3, 0.8),
    twinkleSpeed: rand(0.3, 1.2),
    twinklePhase: Math.random() * Math.PI * 2,
  }));
}

function createCloud(w: number, h: number): Cloud {
  return {
    x: w + rand(100, 300),
    y: rand(h * 0.1, h * 0.8),
    rx: rand(120, 260),
    ry: rand(40, 80),
    speed: rand(0.08, 0.2),
    alpha: rand(0.03, 0.07),
  };
}

function createKoi(w: number, h: number): Koi {
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number, angle: number;
  switch (edge) {
    case 0: x = -40; y = rand(0, h); angle = rand(-0.4, 0.4); break;
    case 1: x = w + 40; y = rand(0, h); angle = Math.PI + rand(-0.4, 0.4); break;
    case 2: x = rand(0, w); y = -40; angle = Math.PI / 2 + rand(-0.4, 0.4); break;
    default: x = rand(0, w); y = h + 40; angle = -Math.PI / 2 + rand(-0.4, 0.4); break;
  }
  return {
    x,
    y,
    angle,
    speed: rand(0.3, 0.6),
    size: rand(22, 34),
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: rand(1.5, 2.5),
    turnTimer: rand(3, 8),
    turnTarget: angle,
  };
}

function createDragon(w: number, h: number): Dragon {
  const headY = rand(h * 0.15, h * 0.7);
  const segments: DragonSegment[] = [];
  const segCount = 40;
  for (let i = 0; i < segCount; i++) {
    segments.push({ x: w + 20 + i * 12, y: headY });
  }
  return {
    segments,
    headX: w + 20,
    headY,
    speed: rand(0.6, 0.9),
    phase: 0,
    alive: true,
  };
}

/* ─── Drawing ────────────────────────────────────────────────────── */

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], time: number) {
  for (const s of stars) {
    const alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const cx1 = w * 0.3 + Math.sin(time * 0.05) * 40;
  const cy1 = h * 0.4 + Math.cos(time * 0.04) * 30;
  const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, w * 0.35);
  g1.addColorStop(0, "rgba(60, 20, 90, 0.025)");
  g1.addColorStop(1, "rgba(60, 20, 90, 0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const cx2 = w * 0.7 + Math.cos(time * 0.06) * 50;
  const cy2 = h * 0.6 + Math.sin(time * 0.03) * 35;
  const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, w * 0.3);
  g2.addColorStop(0, "rgba(20, 30, 80, 0.02)");
  g2.addColorStop(1, "rgba(20, 30, 80, 0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[]) {
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = "#c8b89a";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawKoi(
  ctx: CanvasRenderingContext2D,
  koi: Koi,
  time: number,
  mode: "dark" | "light",
) {
  const { x, y, angle, size, phase, phaseSpeed } = koi;
  const bodyWave = Math.sin(time * phaseSpeed + phase) * 0.15;
  const tailWave = Math.sin(time * phaseSpeed + phase + 1.5) * 0.35;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + bodyWave);

  if (mode === "dark") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.fillStyle = "transparent";
  } else {
    ctx.fillStyle = "rgba(210, 154, 106, 0.35)";
    ctx.strokeStyle = "rgba(180, 130, 80, 0.25)";
    ctx.lineWidth = 1;
  }

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.38, 0, 0, Math.PI * 2);
  if (mode === "dark") {
    ctx.stroke();
  } else {
    ctx.fill();
    ctx.stroke();
  }

  // Tail fin
  ctx.save();
  ctx.translate(-size, 0);
  ctx.rotate(tailWave);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size * 0.55, -size * 0.3);
  ctx.quadraticCurveTo(-size * 0.35, 0, -size * 0.55, size * 0.3);
  ctx.closePath();
  if (mode === "dark") {
    ctx.stroke();
  } else {
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Side fin
  const finWave = Math.sin(time * phaseSpeed * 0.8 + phase + 0.8) * 0.2;
  ctx.save();
  ctx.translate(size * 0.15, size * 0.3);
  ctx.rotate(0.4 + finWave);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.25, size * 0.1, 0, 0, Math.PI * 2);
  if (mode === "dark") {
    ctx.stroke();
  } else {
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawDragon(ctx: CanvasRenderingContext2D, dragon: Dragon) {
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#9a8a70";
  for (let i = 0; i < dragon.segments.length; i++) {
    const seg = dragon.segments[i];
    const r = lerp(6, 3, i / dragon.segments.length);
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ─── Component ──────────────────────────────────────────────────── */

export function EndlessCanvas({ active, mode, showKoi }: EndlessCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    opacity: 0,
    stars: [] as Star[],
    clouds: [] as Cloud[],
    kois: [] as Koi[],
    dragon: null as Dragon | null,
    lastDragonCheck: 0,
    animFrame: 0,
    startTime: 0,
    prevActive: false,
    fadeTarget: 0,
    sized: false,
  });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const st = stateRef.current;
    st.stars = createStars(w, h);
    st.clouds = [createCloud(w, h), createCloud(w, h), createCloud(w, h)];
    st.sized = true;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    stateRef.current.fadeTarget = active ? 1 : 0;
  }, [active]);

  useEffect(() => {
    const st = stateRef.current;
    st.startTime = performance.now() / 1000;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas || !st.sized) {
        st.animFrame = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const now = performance.now() / 1000;
      const time = now - st.startTime;

      // Fade logic
      const fadeSpeed = st.fadeTarget === 1 ? 1.0 : 2.0; // 1s in, 0.5s out
      if (st.opacity < st.fadeTarget) {
        st.opacity = Math.min(st.fadeTarget, st.opacity + fadeSpeed * (1 / 60));
      } else if (st.opacity > st.fadeTarget) {
        st.opacity = Math.max(st.fadeTarget, st.opacity - fadeSpeed * (1 / 60));
      }

      // Skip rendering if fully transparent
      if (st.opacity <= 0) {
        ctx.clearRect(0, 0, w, h);
        st.animFrame = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = st.opacity;

      if (mode === "dark") {
        // Background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.save();
        ctx.globalAlpha = st.opacity;
        drawStars(ctx, st.stars, time);
        ctx.restore();

        // Nebula
        ctx.save();
        ctx.globalAlpha = st.opacity;
        drawNebula(ctx, w, h, time);
        ctx.restore();
      } else {
        // Warm sky background
        ctx.fillStyle = "#f5f0e8";
        ctx.fillRect(0, 0, w, h);

        // Clouds
        ctx.save();
        ctx.globalAlpha = st.opacity;
        for (const c of st.clouds) {
          c.x -= c.speed;
          if (c.x + c.rx < -50) {
            Object.assign(c, createCloud(w, h));
          }
        }
        drawClouds(ctx, st.clouds);
        ctx.restore();

        // Dragon easter egg (light mode only)
        if (st.dragon && st.dragon.alive) {
          ctx.save();
          ctx.globalAlpha = st.opacity;
          // Update dragon
          st.dragon.phase += 0.02;
          st.dragon.headX -= st.dragon.speed;
          const segs = st.dragon.segments;
          segs[0].x = st.dragon.headX;
          segs[0].y = st.dragon.headY + Math.sin(st.dragon.phase) * 20;
          for (let i = 1; i < segs.length; i++) {
            const prev = segs[i - 1];
            const dx = segs[i].x - prev.x;
            const dy = segs[i].y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 12) {
              const ratio = 12 / dist;
              segs[i].x = prev.x + dx * ratio;
              segs[i].y = prev.y + dy * ratio;
            }
            segs[i].y += Math.sin(st.dragon.phase + i * 0.15) * 0.3;
          }
          if (st.dragon.headX < -segs.length * 14) {
            st.dragon.alive = false;
            st.dragon = null;
          } else {
            drawDragon(ctx, st.dragon);
          }
          ctx.restore();
        }

        // Dragon spawn check (~1 in 100 chance per minute → 1 in 6000 per frame at 60fps)
        if (!st.dragon && time - st.lastDragonCheck > 1) {
          st.lastDragonCheck = time;
          if (Math.random() < 1 / 100 / 60) {
            st.dragon = createDragon(w, h);
          }
        }
      }

      // Koi
      if (showKoi) {
        // Spawn koi up to 3
        if (st.kois.length < 3 && Math.random() < 0.002) {
          st.kois.push(createKoi(w, h));
        }

        ctx.save();
        ctx.globalAlpha = st.opacity;
        for (let i = st.kois.length - 1; i >= 0; i--) {
          const k = st.kois[i];

          // Gentle turning
          k.turnTimer -= 1 / 60;
          if (k.turnTimer <= 0) {
            k.turnTarget = k.angle + rand(-0.6, 0.6);
            k.turnTimer = rand(3, 8);
          }
          k.angle = lerp(k.angle, k.turnTarget, 0.01);

          // Move
          k.x += Math.cos(k.angle) * k.speed;
          k.y += Math.sin(k.angle) * k.speed;

          // Remove if far off screen
          const margin = 100;
          if (k.x < -margin || k.x > w + margin || k.y < -margin || k.y > h + margin) {
            st.kois.splice(i, 1);
            continue;
          }

          drawKoi(ctx, k, time, mode);
        }
        ctx.restore();
      } else {
        st.kois = [];
      }

      ctx.globalAlpha = 1;
      st.animFrame = requestAnimationFrame(tick);
    };

    st.animFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(st.animFrame);
    };
  }, [mode, showKoi]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
