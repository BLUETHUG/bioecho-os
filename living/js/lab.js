const EXPERIMENTS = [
    { name: 'Soil Microbiome Analysis', desc: 'Sequencing microbial DNA from 12 forest plots.', status: 'running', progress: 67 },
    { name: 'Pollinator Frequency', desc: 'Tracking visitation rates across seasons.', status: 'running', progress: 43 },
    { name: 'Acoustic Biodiversity', desc: 'Sound spectral analysis for species richness.', status: 'done', progress: 100 },
    { name: 'Mycelium Mapping', desc: 'Tracing nutrient exchange between root systems.', status: 'paused', progress: 28 },
];

function initLab() {
    const canvas = document.getElementById('signalCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; };
        resize(); window.addEventListener('resize', resize);
        let phase = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width, h = canvas.height, mid = h / 2;
            ctx.beginPath(); ctx.strokeStyle = 'rgba(111,163,111,0.15)'; ctx.lineWidth = 3;
            for (let x = 0; x < w; x++) { const t = x / w * Math.PI * 8 + phase; const y = mid + Math.sin(t) * 15 + Math.sin(t * 2.3) * 8 + Math.sin(t * 0.7) * 12; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            ctx.stroke();
            ctx.beginPath(); ctx.strokeStyle = 'rgba(111,163,111,0.4)'; ctx.lineWidth = 1.5;
            for (let x = 0; x < w; x++) { const t = x / w * Math.PI * 8 + phase; const y = mid + Math.sin(t) * 15 + Math.sin(t * 2.3) * 8 + Math.sin(t * 0.7) * 12; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            ctx.stroke();
            phase += 0.025;
            requestAnimationFrame(draw);
        }
        draw();
    }
    renderExperiments();
}

function renderExperiments() {
    const container = document.getElementById('experimentsContainer');
    if (!container) return;
    container.innerHTML = EXPERIMENTS.map(e =>
        `<div class="exp-item">
            <div class="exp-item-header">
                <div><div class="exp-name">${e.name}</div><div class="exp-desc">${e.desc}</div></div>
                <span class="exp-status ${e.status}">${e.status}</span>
            </div>
            <div class="progress"><div class="progress-fill" style="width:${e.progress}%"></div></div>
        </div>`
    ).join('');
}
