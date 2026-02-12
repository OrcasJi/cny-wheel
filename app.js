// ====== 1) 活动配置（改这里就行） ======
const ACTIVITY_ID = "cny-restaurant-2026"; // 换成你餐厅/活动唯一ID
const STORAGE_KEY = `wheel_spin_${ACTIVITY_ID}`;

// 你的奖品（name + weight）
const PRIZES = [
  { name: "Free Mango Pomelo Sago", weight: 10 },
  { name: "Free soft drink", weight: 15 },
  { name: "Free CNY sweet rice cake", weight: 60 },
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
  // 英国本地时间显示（你的用户在英国）
  return d.toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function makeShortId() {
  // 不是真防伪，只是让截图更像凭证
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
    ctx.fillStyle = (i % 2 === 1) ? "#5a0000" : "rgba(255,239,179,0.95)";
    ctx.font = "900 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC";

    // 文字位置：靠外圈一点
    const textR = radius * 0.86;

    // 自动换行（简单版：按长度拆两行）
    const label = PRIZES[i].name;
    const maxLen = 18;
    if (label.length > maxLen) {
      const a = label.slice(0, maxLen);
      const b = label.slice(maxLen);
      ctx.fillText(a, textR, 6);
      ctx.font = "900 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC";
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

drawWheel(currentAngle);

// ====== 4) 旋转动画（真实缓动） ======
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// 指针在顶部。我们要让“中奖扇区中心”对齐到顶部指针。
// canvas 角度：0 在 x正方向。我们把 pointer 视作 -90°（顶部）。
const POINTER_ANGLE = -Math.PI / 2;

function spinToIndex(winIndex) {
  const n = PRIZES.length;
  const slice = (Math.PI * 2) / n;

  // 中奖扇区中心角（相对转盘坐标）
  const targetCenter = winIndex * slice + slice / 2;

  // 我们希望：currentAngle + targetCenter 对齐到 POINTER_ANGLE
  // => finalAngle = POINTER_ANGLE - targetCenter (再加若干圈)
  const base = POINTER_ANGLE + targetCenter;

  const extraTurns = 7; // 额外转几圈，越大越爽
  const finalAngle = base + extraTurns * Math.PI * 2;

  const startAngle = currentAngle;
  const delta = finalAngle - startAngle;

  const duration = 5200; // ms
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
      spinBtn.disabled = true; // 结束后仍禁用（一次性）
      onWin(winIndex);
    }
  }

  requestAnimationFrame(frame);
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

function lockIfAlreadySpun() {
  const state = loadSpinState();
  if (state && state.prize) {
    // 已抽过：直接显示结果，并禁用按钮
    spinBtn.disabled = true;
    showResult(state.prize, state.time, state.id);
  } else {
    spinBtn.disabled = false;
  }
}

function showResult(prize, time, id) {
  resultPrize.textContent = prize;
  resultTime.textContent = time;
  resultId.textContent = id;
  resultBox.hidden = false;
}

function onWin(winIndex) {
  const prize = PRIZES[winIndex].name;
  const time = nowStamp();
  const id = makeShortId();

  const state = { prize, time, id };
  saveSpinState(state);
  showResult(prize, time, id);
}

spinBtn.addEventListener("click", () => {
  if (spinning) return;

  const state = loadSpinState();
  if (state && state.prize) {
    // 理论上不会点到，双保险
    showResult(state.prize, state.time, state.id);
    spinBtn.disabled = true;
    return;
  }

  const winIndex = weightedPickIndex(PRIZES);
  spinToIndex(winIndex);
});

// 测试用：清除一次性限制
resetBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  resultBox.hidden = true;
  spinBtn.disabled = false;
});

// 初始化
lockIfAlreadySpun();
