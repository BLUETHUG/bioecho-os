const TOTAL = 8;
let current = 0;
let nextScene = 0;
let transitioning = false;
let transProgress = 0;

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// ========== NAV ==========
(function buildNav() {
    const nav = document.getElementById('uiNav');
    for (let i = 0; i < TOTAL; i++) {
        const a = document.createElement('a');
        a.href = '#';
        a.dataset.scene = i;
        if (i === 0) a.className = 'active';
        const span = document.createElement('span');
        span.className = 'nl';
        span.textContent = String(i).padStart(2, '0');
        a.appendChild(span);
        a.addEventListener('click', (e) => { e.preventDefault(); go(parseInt(a.dataset.scene)); });
        nav.appendChild(a);
    }
})();

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(current + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(current - 1);
});

function go(idx) {
    if (idx === current || idx < 0 || idx >= TOTAL || transitioning) return;
    nextScene = idx;
    transitioning = true;
    transProgress = 0;
    document.querySelectorAll('[data-scene]').forEach(el => el.classList.toggle('active', parseInt(el.dataset.scene) === idx));
}

// ========== LOADER ==========
setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.style.transition = 'opacity 0.75s cubic-bezier(0.22,1,0.36,1)';
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 800);
}, 2200);

// ========== SCENE RENDERERS ==========
const time = { value: 0 };

function renderScene0(t) {
    const cx = W / 2, cy = H / 2;
    const pulse = Math.sin(t * 0.5) * 0.5 + 0.5;

    ctx.clearRect(0, 0, W, H);

    // central geometric shape
    ctx.save();
    ctx.translate(cx, cy);

    for (let ring = 0; ring < 5; ring++) {
        const r = 40 + ring * 28 + pulse * 8;
        const sides = 6 + ring;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const a = (i / sides) * Math.PI * 2 + t * 0.1 * (ring % 2 === 0 ? 1 : -1);
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(26,26,26,${0.06 + ring * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // inner shape
    const innerR = 20 + pulse * 6;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.05;
        const r2 = innerR + Math.sin(a * 3 + t) * 6;
        const x = Math.cos(a) * r2;
        const y = Math.sin(a) * r2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(45,107,79,${0.3 + pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // particles
    for (let i = 0; i < 30; i++) {
        const seed = i * 137.5;
        const x = (Math.sin(seed + t * 0.1) * 0.5 + 0.5) * W;
        const y = ((Math.cos(seed * 1.3 + t * 0.08) * 0.5 + 0.5) * 0.7 + 0.15) * H;
        const s = 1 + Math.sin(seed + t * 2) * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,26,26,${0.04 + Math.sin(seed + t) * 0.02 + 0.02})`;
        ctx.fill();
    }
}

function renderScene1(t) {
    ctx.clearRect(0, 0, W, H);
    const mid = H / 2;

    for (let l = 0; l < 12; l++) {
        ctx.beginPath();
        const amp = 20 + l * 6;
        const freq = 0.008 + l * 0.001;
        const phase = t * (0.5 + l * 0.05);
        for (let x = 0; x < W; x += 2) {
            const y = mid + Math.sin(x * freq + phase) * amp;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(26,26,26,${0.03 + l * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function renderScene2(t) {
    ctx.clearRect(0, 0, W, H);
    const cols = 6;
    const gap = 8;
    const totalW = W - 80;
    const barW = (totalW - gap * (cols - 1)) / cols;
    const startX = (W - totalW) / 2;
    const maxH = H * 0.5;
    const baseY = H / 2 + maxH / 2;

    const vals = [78, 64, 82, 71, 59, 50 + Math.sin(t) * 10];

    for (let i = 0; i < cols; i++) {
        const v = vals[i] / 100;
        const bh = maxH * v;
        const x = startX + i * (barW + gap);
        const y = baseY - bh;

        ctx.fillStyle = `rgba(26,26,26,${0.06 + v * 0.12})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, bh, 2);
        ctx.fill();

        ctx.fillStyle = `rgba(45,107,79,${0.15 + v * 0.25})`;
        ctx.beginPath();
        ctx.roundRect(x, baseY - bh * 0.3, barW, bh * 0.3, 2);
        ctx.fill();

        if (i < cols - 1) {
            ctx.fillStyle = `rgba(26,26,26,${0.03})`;
            ctx.fillRect(x + barW, baseY - 1, gap, 2);
        }
    }
}

function renderScene3(t) {
    ctx.clearRect(0, 0, W, H);
    const cols = 3, rows = 2;
    const gap = 12;
    const cw = 80, ch = 80;
    const totalW = cols * cw + (cols - 1) * gap;
    const totalH = rows * ch + (rows - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = (H - totalH) / 2;

    const colors = ['#2d6b4f','#3d7b5f','#4d8b6f','#5d9b7f','#6dab8f','#7dbb9f'];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const x = startX + c * (cw + gap);
            const y = startY + r * (ch + gap);
            const pulse = Math.sin(t + idx * 1.5) * 0.5 + 0.5;

            ctx.fillStyle = `rgba(26,26,26,${0.04 + pulse * 0.06})`;
            ctx.beginPath();
            ctx.roundRect(x, y, cw, ch, 4);
            ctx.fill();

            ctx.strokeStyle = `rgba(26,26,26,${0.06 + pulse * 0.08})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (pulse > 0.5) {
                ctx.fillStyle = `rgba(45,107,79,${pulse * 0.12})`;
                ctx.beginPath();
                ctx.roundRect(x + 4, y + 4, cw - 8, ch - 8, 2);
                ctx.fill();
            }
        }
    }
}

function renderScene4(t) {
    ctx.clearRect(0, 0, W, H);
    const cols = 2;
    const gap = 12;
    const cardW = 200, cardH = 140;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = (H - cardH) / 2;

    for (let i = 0; i < 4; i++) {
        const x = startX + (i % cols) * (cardW + gap);
        const y = startY + Math.floor(i / cols) * (cardH + gap);
        const pulse = Math.sin(t * 0.5 + i * 1.7) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(255,255,255,${0.06 + pulse * 0.08})`;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 6);
        ctx.fill();

        ctx.strokeStyle = `rgba(26,26,26,${0.05 + pulse * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // circle inside
        const cx = x + cardW / 2, cy = y + 45;
        const cr = 12 + pulse * 4;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,107,79,${0.1 + pulse * 0.15})`;
        ctx.fill();

        // line
        ctx.fillStyle = `rgba(26,26,26,${0.04})`;
        ctx.fillRect(x + 20, y + 80, cardW - 40, 1);
        ctx.fillRect(x + 30, y + 92, cardW - 60, 1);
        ctx.fillRect(x + 40, y + 104, cardW - 80, 1);
    }
}

function renderScene5(t) {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    for (let i = 0; i < 8; i++) {
        const r = 30 + i * 18 + Math.sin(t * 0.3 + i * 0.5) * 6;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(26,26,26,${0.04 + i * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, t * 0.2 + i * 0.3, t * 0.2 + i * 0.3 + Math.PI * 1.2);
            ctx.strokeStyle = `rgba(45,107,79,${0.1 + i * 0.015})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    // orbiting dot
    const orbR = 90 + Math.sin(t * 0.5) * 10;
    const ox = cx + Math.cos(t * 0.4) * orbR;
    const oy = cy + Math.sin(t * 0.4) * orbR;
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${0.3 + Math.sin(t) * 0.1 + 0.2})`;
    ctx.fill();
}

function renderScene6(t) {
    ctx.clearRect(0, 0, W, H);
    const mid = H / 2;

    ctx.beginPath();
    for (let x = 0; x < W; x += 2) {
        const y = mid + Math.sin(x * 0.02 + t * 0.8) * 25 + Math.sin(x * 0.04 + t * 1.2) * 12 + Math.sin(x * 0.008 + t * 0.4) * 20;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(26,26,26,${0.12})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x < W; x += 2) {
        const y = mid + Math.sin(x * 0.02 + t * 0.8) * 25 + Math.sin(x * 0.04 + t * 1.2) * 12 + Math.sin(x * 0.008 + t * 0.4) * 20;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(45,107,79,${0.2})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // moving dot
    const dotX = ((t * 40) % W);
    const dotY = mid + Math.sin(dotX * 0.02 + t * 0.8) * 25 + Math.sin(dotX * 0.04 + t * 1.2) * 12 + Math.sin(dotX * 0.008 + t * 0.4) * 20;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${0.3})`;
    ctx.fill();
    ctx.shadowColor = 'rgba(45,107,79,0.15)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

function renderScene7(t) {
    ctx.clearRect(0, 0, W, H);
    const startX = 60;
    const endX = W - 60;
    const cy = H / 2;

    // line
    ctx.strokeStyle = `rgba(26,26,26,${0.06})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    ctx.lineTo(endX, cy);
    ctx.stroke();

    // dots
    const count = 7;
    for (let i = 0; i < count; i++) {
        const x = startX + (i / (count - 1)) * (endX - startX);
        const pulse = Math.sin(t * 0.3 + i * 0.9) * 0.5 + 0.5;
        const r = 3 + pulse * 3;

        ctx.beginPath();
        ctx.arc(x, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,26,26,${0.04 + pulse * 0.08})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,107,79,${0.1 + pulse * 0.15})`;
        ctx.fill();

        // connecting vertical line
        ctx.fillStyle = `rgba(26,26,26,${0.02})`;
        ctx.fillRect(x - 0.5, cy - 20 - pulse * 15, 1, 40 + pulse * 30);
    }
}

const renderers = [
    renderScene0, renderScene1, renderScene2, renderScene3,
    renderScene4, renderScene5, renderScene6, renderScene7
];

// ========== MAIN LOOP ==========
function loop(timestamp) {
    const t = timestamp / 1000;
    time.value = t;

    if (transitioning) {
        transProgress += 0.02;
        if (transProgress >= 1) {
            transProgress = 1;
            current = nextScene;
            transitioning = false;
        }
    }

    const alpha = transitioning ? 1 - transProgress : 1;
    renderers[current](t);

    if (transitioning) {
        ctx.fillStyle = `rgba(160,165,177,${transProgress * 0.5})`;
        ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
