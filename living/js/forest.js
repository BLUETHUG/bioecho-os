const FOREST = {
    canopy: 78, biodiversity: 64, water: 82, soil: 71, pollinators: 59,
    season: 'summer', phase: 'day',
};

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const PHASES = ['dawn', 'day', 'twilight', 'night'];

function initForest() {
    tickForest();
    setInterval(() => {
        ['canopy','biodiversity','water','soil','pollinators'].forEach(k => {
            FOREST[k] = Math.max(0, Math.min(100, FOREST[k] + (Math.random() - 0.5) * 1.5));
        });
        tickForest();
    }, 3000);
    setInterval(() => {
        FOREST.season = SEASONS[(SEASONS.indexOf(FOREST.season) + 1) % 4];
        tickForest();
    }, 60000);
    setInterval(() => {
        FOREST.phase = PHASES[(PHASES.indexOf(FOREST.phase) + 1) % 4];
        tickForest();
    }, 30000);
}

function tickForest() {
    ['canopy','biodiversity','water','soil','pollinators'].forEach(k => {
        const el = document.getElementById('forest' + k.charAt(0).toUpperCase() + k.slice(1));
        if (el) el.textContent = Math.round(FOREST[k]);
        const bar = document.querySelector(`[data-stat="${k}"]`);
        if (bar) { bar.style.width = `${Math.round(FOREST[k])}%`; }
    });
    const s = document.getElementById('forestSeason');
    if (s) s.textContent = FOREST.season;
    const p = document.getElementById('forestPhase');
    if (p) p.textContent = FOREST.phase;
}
