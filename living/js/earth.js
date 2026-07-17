const EARTH_STATE = {
    treesPlanted: 1247,
    missionsCompleted: 89,
    activeCitizens: 342,
    regions: 12,
    carbonOffset: 45.6,
};

const MISSIONS = [
    { id: 1, title: 'Reforest the Ridge', desc: 'Plant 50 native trees in the Eastern Ridge area.', reward: '🌱 200 saplings', status: 'active', progress: 34 },
    { id: 2, title: 'Pollinator Corridor', desc: 'Create a continuous wildflower corridor spanning 2km.', reward: '🦋 Pollinator badge', status: 'active', progress: 62 },
    { id: 3, title: 'Waterway Cleanup', desc: 'Remove invasive species from the River Bend ecosystem.', reward: '💧 Pure water token', status: 'upcoming', progress: 0 },
    { id: 4, title: 'Night Survey', desc: 'Document nocturnal species activity in the old forest.', reward: '🌙 Night owl rank', status: 'completed', progress: 100 },
];

function initEarth() {
    updateEarthUI();
    setInterval(() => {
        EARTH_STATE.treesPlanted += Math.floor(Math.random() * 3);
        EARTH_STATE.carbonOffset += Math.random() * 0.5;
        updateEarthUI();
    }, 10000);
}

function updateEarthUI() {
    Object.keys(EARTH_STATE).forEach(key => {
        const el = document.getElementById(`earth${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (el) {
            if (typeof EARTH_STATE[key] === 'number' && !Number.isInteger(EARTH_STATE[key])) {
                el.textContent = EARTH_STATE[key].toFixed(1);
            } else {
                el.textContent = EARTH_STATE[key];
            }
        }
    });

    const missionsContainer = document.getElementById('missionsContainer');
    if (missionsContainer) {
        missionsContainer.innerHTML = MISSIONS.map(m => `
            <div class="mission-card">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem">
                    <span class="mission-badge ${m.status}">${m.status}</span>
                    <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--sunset)">${m.reward}</span>
                </div>
                <h4 style="font-size:1rem;color:var(--cream);margin-bottom:0.25rem">${m.title}</h4>
                <p style="font-size:0.85rem;color:rgba(245,240,232,0.5);margin-bottom:0.75rem">${m.desc}</p>
                ${m.status === 'active' ? `
                <div class="bio-progress-vine">
                    <div class="fill" style="width:${m.progress}%"></div>
                </div>
                <div style="font-family:var(--font-mono);font-size:0.7rem;color:rgba(245,240,232,0.3);margin-top:0.25rem;text-align:right">${m.progress}%</div>
                ` : ''}
                ${m.status === 'completed' ? `<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--river);margin-top:0.25rem">✓ Completed</div>` : ''}
            </div>
        `).join('');
    }
}
