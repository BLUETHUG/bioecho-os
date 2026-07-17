const EARTH = {
    treesPlanted: 1247, missionsCompleted: 89, activeCitizens: 342, carbonOffset: 45.6,
};

const MISSIONS = [
    { title: 'Reforest the Ridge', desc: 'Plant 50 native trees in the Eastern Ridge area.', status: 'active', progress: 34 },
    { title: 'Pollinator Corridor', desc: 'Create a wildflower corridor spanning 2km.', status: 'active', progress: 62 },
    { title: 'Waterway Cleanup', desc: 'Remove invasive species from River Bend.', status: 'upcoming', progress: 0 },
    { title: 'Night Survey', desc: 'Document nocturnal species in the old forest.', status: 'done', progress: 100 },
];

function initEarth() {
    tickEarth();
    setInterval(() => { EARTH.treesPlanted += Math.floor(Math.random() * 2); EARTH.carbonOffset += Math.random() * 0.3; tickEarth(); }, 10000);
}

function tickEarth() {
    const m = { treesPlanted: 'earthTreesPlanted', missionsCompleted: 'earthMissionsCompleted', activeCitizens: 'earthActiveCitizens', carbonOffset: 'earthCarbonOffset' };
    Object.keys(m).forEach(k => { const el = document.getElementById(m[k]); if (el) el.textContent = typeof EARTH[k] === 'number' && !Number.isInteger(EARTH[k]) ? EARTH[k].toFixed(1) : EARTH[k]; });
    const container = document.getElementById('missionsContainer');
    if (!container) return;
    container.innerHTML = MISSIONS.map(m =>
        `<div class="mission-item">
            <span class="mission-badge ${m.status}">${m.status}</span>
            <div class="mission-title">${m.title}</div>
            <div class="mission-desc">${m.desc}</div>
            ${m.status === 'active' ? `<div class="progress" style="margin-top:0.5rem"><div class="progress-fill" style="width:${m.progress}%"></div></div>` : ''}
        </div>`
    ).join('');
}
