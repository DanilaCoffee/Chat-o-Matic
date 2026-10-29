export function initDots() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  if (window.matchMedia('(max-width: 768px)').matches) return;

  const ctx = canvas.getContext('2d');
  canvas.width = 1920;
  canvas.height = 1080;

  function resize() {
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 175;
  const DETECT = 160;
  const SPEED = 1;
  const FPS = 30;
  const FRAME_MS = 1000 / FPS;

  const dots = Array.from({ length: COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * SPEED,
    vy: (Math.random() - 0.5) * SPEED,
    // Между старым (0.8–2.0) и новым (1.6–3.4)
    r: Math.random() * 1.2 + 1.2, // ~1.2–2.4
    // Между старым (0.25–0.5) и новым (0.45–0.75)
    alpha: Math.random() * 0.25 + 0.35, // ~0.35–0.6
    pulse: Math.random() * Math.PI * 2
  }));

  const PINK = [255, 45, 149];
  const VIOLET = [138, 43, 226];

  let last = 0;
  let phase = 0;

  function getColor(t) {
    const r = Math.round(PINK[0] + (VIOLET[0] - PINK[0]) * t);
    const g = Math.round(PINK[1] + (VIOLET[1] - PINK[1]) * t);
    const b = Math.round(PINK[2] + (VIOLET[2] - PINK[2]) * t);
    return [r, g, b];
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    last = now;

    phase += 0.011;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > canvas.width)  d.vx *= -1;
      if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    // Линии — между старым (0.22 / 1.4) и новым (0.42 / 2.0)
    ctx.lineCap = 'round';
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < DETECT) {
          const t = 1 - dist / DETECT;
          const mx = (a.x + b.x) * 0.5;
          const my = (a.y + b.y) * 0.5;

          const dxCenter = mx - centerX;
          const dyCenter = my - centerY;
          const distToCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

          const wave = (distToCenter / maxDist) + Math.sin(phase) * 0.5;
          const colorT = Math.max(0, Math.min(1, wave));

          const [cr, cg, cb] = getColor(colorT);

          // Между 0.22 и 0.42 — берём 0.30; между 1.4 и 2.0 — берём 1.6
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${t * 0.30})`;
          ctx.lineWidth = t * 1.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Точки — со свечением, но скромным (shadowBlur 6 вместо 12)
    for (const d of dots) {
      const dxCenter = d.x - centerX;
      const dyCenter = d.y - centerY;
      const distToCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

      const wave = (distToCenter / maxDist) + Math.sin(phase) * 0.5;
      const colorT = Math.max(0, Math.min(1, wave));

      const [cr, cg, cb] = getColor(colorT);

      // Пульсация мягче: ±15% вместо ±25%
      const pulseR = d.r * (1 + Math.sin(phase * 2 + d.pulse) * 0.15);

      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

      ctx.shadowColor = `rgba(${cr},${cg},${cb},0.8)`;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(d.x, d.y, pulseR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(loop);
}