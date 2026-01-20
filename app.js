// Simple interactive highway-style background animation (canvas)
// - moving lane lines
// - cars (rectangles) flowing
// - subtle mouse steering influence
// Lightweight & runs on GitHub Pages.

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

const navToggle = document.getElementById("navToggle");
const nav = document.querySelector(".nav");
navToggle?.addEventListener("click", () => nav.classList.toggle("open"));

document.getElementById("year").textContent = String(new Date().getFullYear());

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const state = {
  t: 0,
  speed: 180,            // lane flow speed
  laneOffset: 0,
  mouseX: 0.5,
  mouseY: 0.5,
  targetLean: 0,
  lean: 0
};

window.addEventListener("mousemove", (e) => {
  state.mouseX = e.clientX / Math.max(1, W);
  state.mouseY = e.clientY / Math.max(1, H);
  state.targetLean = (state.mouseX - 0.5) * 0.8; // steer visual
});

function rand(min, max) { return Math.random() * (max - min) + min; }

const cars = [];
const laneCount = 4;

function spawnCar() {
  const lane = Math.floor(rand(0, laneCount));
  const laneW = Math.min(120, Math.max(80, W * 0.08));
  const roadW = laneW * laneCount;
  const roadX = (W - roadW) / 2;

  cars.push({
    lane,
    x: roadX + laneW * lane + laneW * 0.12,
    y: -rand(60, 260),
    w: laneW * rand(0.55, 0.78),
    h: rand(36, 54),
    v: rand(0.9, 1.35), // relative to lane speed
    glow: rand(0.08, 0.18)
  });
}

for (let i = 0; i < 10; i++) spawnCar();

function drawRoad() {
  // background gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10,14,26,0.0)");
  g.addColorStop(1, "rgba(10,14,26,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // road geometry
  const laneW = Math.min(120, Math.max(80, W * 0.08));
  const roadW = laneW * laneCount;
  const roadX = (W - roadW) / 2;
  const roadY = 0;

  // slight perspective / lean
  const lean = state.lean;
  const skew = lean * 70;

  // road surface
  ctx.save();
  ctx.translate(skew, 0);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(roadX, roadY, roadW, H);

  // road edges
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(roadX + 0.5, 0.5, roadW - 1, H - 1);

  // lane lines
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.setLineDash([18, 18]);
  ctx.lineWidth = 2;

  state.laneOffset = (state.laneOffset + (state.speed * 0.016)) % 36;
  for (let i = 1; i < laneCount; i++) {
    const x = roadX + i * laneW;
    ctx.beginPath();
    for (let y = -40; y < H + 80; y += 36) {
      ctx.moveTo(x, y + state.laneOffset);
      ctx.lineTo(x, y + 18 + state.laneOffset);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.restore();
}

function drawCars(dt) {
  const laneW = Math.min(120, Math.max(80, W * 0.08));
  const roadW = laneW * laneCount;
  const roadX = (W - roadW) / 2;

  // update lean smoothly
  state.lean += (state.targetLean - state.lean) * 0.06;

  const skew = state.lean * 70;

  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    c.y += state.speed * c.v * dt;

    // remove / respawn
    if (c.y > H + 120) {
      cars.splice(i, 1);
      if (cars.length < 14) spawnCar();
      continue;
    }

    // draw car
    ctx.save();
    ctx.translate(skew, 0);

    // subtle hover effect based on mouse
    const mx = (state.mouseX - 0.5) * 18;
    const x = c.x + mx;
    const y = c.y;

    // glow
    ctx.fillStyle = `rgba(122,167,255,${c.glow})`;
    roundRect(x - 6, y - 6, c.w + 12, c.h + 12, 10);
    ctx.fill();

    // body
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(x, y, c.w, c.h, 10);
    ctx.fill();

    // windshield
    ctx.fillStyle = "rgba(157,255,207,0.10)";
    roundRect(x + c.w * 0.12, y + c.h * 0.18, c.w * 0.76, c.h * 0.36, 8);
    ctx.fill();

    // tail lights
    ctx.fillStyle = "rgba(255,120,120,0.18)";
    ctx.fillRect(x + 6, y + c.h - 8, 10, 4);
    ctx.fillRect(x + c.w - 16, y + c.h - 8, 10, 4);

    ctx.restore();
  }
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  ctx.clearRect(0, 0, W, H);
  drawRoad();
  drawCars(dt);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
