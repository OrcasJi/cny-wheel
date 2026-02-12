// ====== 1) 活动配置（改这里就行） ======
const ACTIVITY_ID = "cny-restaurant-2026"; // 换成你餐厅/活动唯一ID
const STORAGE_KEY = `wheel_spin_${ACTIVITY_ID}`;

// 你的奖品（name + weight）
const PRIZES = [
  { name: "One FREE Mango Pomelo Sago", weight: 10 },
  { name: "One FREE soft drink", weight: 15 },
  { name: "FREE CNY sweet rice cake", weight: 60 },
  // 你可以继续加：{ name: "谢谢参与", weight: 200 }
];

// 扇区配色（春节红金系）
const SLICE_COLORS = [
  ["#b40000", "#7a0000"], // red
  ["#f5d36a", "#d8b04f"], // gold
  ["#8a0000", "#5a0000"], // deep red
  ["#ffefb3", "#f5d36a"], // light gold
];

// ====== 2) 工具函数 ======
function weightedPickIndex(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function makeShortId() {
  const s = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `CNY-${s}`;
}

// ====== 3) 画转盘（Canvas） ======
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");

const resultBox = document.getElementById("resultBox");
const resultPrize = document.getElementById("resultPrize");
const resultTime = document.getElementById("resultTime");
const resultId = document.getElementById("resultId");

const W = canvas.width;
const H = canvas.height;
const cx = W / 2;
const cy = H / 2;
const radius = Math.min(W, H) / 2 - 10;

let currentAngle = 0; // radians
let spinning = false;

function drawWheel(angleRad) {
  ctx.clearRect(0, 0, W, H);

  // outer ring glow
  const ring = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  ring.addColorStop(0, "rgba(255,255,255,0.08)");
  ring.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.fill();

  const n = PRIZES.length;
  const slice = (Math.PI * 2) / n;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  for (let i = 0; i < n; i++) {
    const start = i * slice;
    const end = start + slice;

    // slice gradient
    const [c1, c2] = SLICE_COLORS[i % SLICE_COLORS.length];
    const g = ctx.createLinearGradient(0, 0, radius, radius);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // separator line
    ctx.strokeStyle = "rgba(255,239,179,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // prize text
    ctx.save();
    ctx.rotate(start + slice / 2);

    ctx.textAlign = "right";
    ctx.fillStyle = i % 2 === 1 ? "#5a0000" : "rgba(255,239,179,0.95)";
    ctx.font =
      "900 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC";

    const textR = radius * 0.86;

    // 自动换行（简单版）
    const label = PRIZES[i].name;
    const maxLen = 18;
    if (label.length > maxLen) {
      const a = label.slice(0, maxLen);
      const b = label.slice(maxLen);
      ctx.fillText(a, textR, 6);
      ctx.font =
        "900 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC";
      ctx.fillText(b, textR, 28);
    } else {
      ctx.fillText(label, textR, 12);
    }

    ctx.restore();
  }

  ctx.restore();

  // small sparkles dots
  ctx.fillStyle = "rgba(255,239,179,0.8)";
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2 + angleRad * 0.3;
    const r = radius + 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ====== 4) 旋转动画（真实缓动） ======
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// 指针固定在顶部（12点方向）
const TWO_PI = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2;

// 计算“让某个扇区中心对齐指针”的角度（用于刷新后复原轮盘）
function alignedAngleForIndex(winIndex) {
  const n = PRIZES.length;
  const slice = TWO_PI / n;
  const targetCenter = winIndex * slice + slice / 2;

  let ang = POINTER_ANGLE - targetCenter;
  ang = ((ang % TWO_PI) + TWO_PI) % TWO_PI; // normalize
  return ang;
}

function spinToIndex(winIndex) {
  const n = PRIZES.length;
  const slice = TWO_PI / n;

  const targetCenter = winIndex * slice + slice / 2;
  const base = POINTER_ANGLE - targetCenter;

  // 强制顺时针
  let finalAngle = base;
  while (finalAngle <= currentAngle) finalAngle += TWO_PI;

  const extraTurns = 7;
  finalAngle += extraTurns * TWO_PI;

  const startAngle = currentAngle;
  const delta = finalAngle - startAngle;

  const duration = 5200;
  const start = performance.now();

  spinning = true;
  spinBtn.disabled = true;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);

    currentAngle = startAngle + delta * eased;
    drawWheel(currentAngle);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      spinning = false;
      spinBtn.disabled = true; // 一次性
      onWin(winIndex);
    }
  }

  requestAnimationFrame(frame);
}

// ====== 4.5) Win FX: simple fireworks (safe even if #fx not added yet) ======
const panelEl = document.querySelector(".panel");
const fxCanvas = document.getElementById("fx"); // 你待会在 HTML 加这个 canvas
const fxCtx = fxCanvas ? fxCanvas.getContext("2d") : null;

function resizeFxCanvas() {
  if (!fxCanvas || !panelEl || !fxCtx) return;
  const r = panelEl.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  fxCanvas.width = Math.floor(r.width * dpr);
  fxCanvas.height = Math.floor(r.height * dpr);
  fxCanvas.style.width = `${r.width}px`;
  fxCanvas.style.height = `${r.height}px`;

  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", () => {
  // 只有当你加了 #fx 才会执行有效
  resizeFxCanvas();
});

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function fireworkBurst(x, y, count = 90) {
  // ✅ 容错：你还没加 HTML/CSS 时不会报错
  if (!fxCtx || !fxCanvas || !panelEl) return;

  resizeFxCanvas();
  panelEl.classList.add("fx-on");

  const particles = [];
  const gravity = 0.06;
  const friction = 0.985;
  const lifeMax = 70;

  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(2.2, 6.2);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: rand(1.2, 2.6),
      life: Math.floor(rand(40, lifeMax)),
      // 金/红更春节
      hue: Math.random() < 0.65 ? rand(38, 55) : rand(0, 12),
      alpha: 1
    });
  }

  let frame = 0;
  function tick() {
    frame++;
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    fxCtx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.vx *= friction;
      p.vy = p.vy * friction + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      const t = Math.max(0, p.life / lifeMax);
      p.alpha = t;

      fxCtx.beginPath();
      fxCtx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.alpha})`;
      fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fxCtx.fill();
    }

    fxCtx.globalCompositeOperation = "source-over";

    // remove dead
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (particles.length > 0 && frame < 120) {
      requestAnimationFrame(tick);
    } else {
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      panelEl.classList.remove("fx-on");
    }
  }

  requestAnimationFrame(tick);
}

// ====== 5) 一次性限制 + 结果展示 ======
function loadSpinState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSpinState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showResult(prize, time, id) {
  resultPrize.textContent = prize;
  resultTime.textContent = time;
  resultId.textContent = id;
  resultBox.hidden = false;
}

function lockIfAlreadySpun() {
  const state = loadSpinState();

  if (state && state.prize) {
    spinBtn.disabled = true;

    let idx = Number.isInteger(state.winIndex)
      ? state.winIndex
      : PRIZES.findIndex((p) => p.name === state.prize);

    if (idx >= 0) {
      currentAngle = alignedAngleForIndex(idx);
    }
    drawWheel(currentAngle);

    showResult(state.prize, state.time, state.id);
  } else {
    spinBtn.disabled = false;
    drawWheel(currentAngle);
  }
}

function onWin(winIndex) {
  const prize = PRIZES[winIndex].name;
  const time = nowStamp();
  const id = makeShortId();

  // 保存 winIndex：刷新后轮盘与结果一致
  const state = { prize, time, id, winIndex };
  saveSpinState(state);

  showResult(prize, time, id);

  // 🔥 烟花：位置在 panel 的上方偏中间，像在轮盘上方炸开
  // 你待会加了 HTML 的 <canvas id="fx"> + CSS 后就会显示
  if (panelEl) {
    fireworkBurst(panelEl.clientWidth * 0.5, panelEl.clientHeight * 0.30, 95);
  }
}

spinBtn.addEventListener("click", () => {
  if (spinning) return;

  const state = loadSpinState();
  if (state && state.prize) {
    showResult(state.prize, state.time, state.id);
    spinBtn.disabled = true;
    return;
  }

  const winIndex = weightedPickIndex(PRIZES);
  spinToIndex(winIndex);
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  resultBox.hidden = true;
  spinBtn.disabled = false;

  currentAngle = 0;
  drawWheel(currentAngle);

  // 如果有特效层，顺便清空
  if (fxCtx && fxCanvas) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
  if (panelEl) panelEl.classList.remove("fx-on");
});

// 初始化
lockIfAlreadySpun();
