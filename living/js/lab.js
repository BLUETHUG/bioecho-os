const LAB_STATE = {
    experiments: [
        { id: 1, name: 'Soil Microbiome Analysis', desc: 'Sequencing microbial DNA from 12 forest plots.', status: 'running', progress: 67 },
        { id: 2, name: 'Pollinator Frequency Study', desc: 'Tracking visitation rates across seasonal transitions.', status: 'running', progress: 43 },
        { id: 3, name: 'Acoustic Biodiversity Index', desc: 'Using sound spectral analysis to estimate species richness.', status: 'completed', progress: 100 },
        { id: 4, name: 'Mycelium Network Mapping', desc: 'Tracing nutrient exchange pathways between root systems.', status: 'paused', progress: 28 },
    ],
    signals: [],
};

function initLab() {
    const canvas = document.getElementById('signalCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const resize = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        let phase = 0;
        function drawSignal() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width, h = canvas.height;
            const mid = h / 2;

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(95, 168, 211, 0.3)';
            ctx.lineWidth = 4;
            for (let x = 0; x < w; x++) {
                const t = x / w * Math.PI * 8 + phase;
                const y = mid + Math.sin(t) * 20 + Math.sin(t * 2.3) * 12 + Math.sin(t * 0.7) * 18;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(95, 168, 211, 0.6)';
            ctx.lineWidth = 2;
            for (let x = 0; x < w; x++) {
                const t = x / w * Math.PI * 8 + phase;
                const y = mid + Math.sin(t) * 20 + Math.sin(t * 2.3) * 12 + Math.sin(t * 0.7) * 18;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(111, 163, 111, 0.5)';
            ctx.lineWidth = 1.5;
            for (let x = 0; x < w; x++) {
                const t = x / w * Math.PI * 5 + phase * 0.7;
                const y = mid + Math.cos(t * 1.7) * 15 + Math.sin(t * 3.1) * 8;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            const dotX = ((phase % (Math.PI * 2)) / (Math.PI * 2)) * w;
            const dotY = mid + Math.sin(phase) * 20 + Math.sin(phase * 2.3) * 12 + Math.sin(phase * 0.7) * 18;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'var(--fern)';
            ctx.fill();
            ctx.shadowColor = 'var(--fern)';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;

            phase += 0.03;
            requestAnimationFrame(drawSignal);
        }
        drawSignal();
    }

    renderExperiments();
}

function renderExperiments() {
    const container = document.getElementById('experimentsContainer');
    if (!container) return;
    container.innerHTML = LAB_STATE.experiments.map(e => `
        <div class="experiment-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem">
                <div>
                    <h4 style="font-size:1rem;color:var(--cream);margin-bottom:0.25rem">${e.name}</h4>
                    <p style="font-size:0.85rem;color:rgba(245,240,232,0.5)">${e.desc}</p>
                </div>
                <span class="experiment-status ${e.status}">${e.status}</span>
            </div>
            <div class="bio-progress-vine">
                <div class="fill" style="width:${e.progress}%"></div>
            </div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:rgba(245,240,232,0.3);margin-top:0.25rem;text-align:right">${e.progress}%</div>
        </div>
    `).join('');
}
