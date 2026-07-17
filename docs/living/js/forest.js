const FOREST_STATE = {
    canopy: 78,
    biodiversity: 64,
    water: 82,
    soil: 71,
    pollinators: 59,
    season: 'summer',
    phase: 'day',
};

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const PHASES = ['dawn', 'day', 'twilight', 'night'];

function initForest() {
    updateForestUI();
    setInterval(() => {
        FOREST_STATE.canopy = Math.max(0, Math.min(100, FOREST_STATE.canopy + (Math.random() - 0.5) * 2));
        FOREST_STATE.biodiversity = Math.max(0, Math.min(100, FOREST_STATE.biodiversity + (Math.random() - 0.5) * 1.5));
        FOREST_STATE.water = Math.max(0, Math.min(100, FOREST_STATE.water + (Math.random() - 0.5) * 1));
        FOREST_STATE.soil = Math.max(0, Math.min(100, FOREST_STATE.soil + (Math.random() - 0.5) * 0.8));
        FOREST_STATE.pollinators = Math.max(0, Math.min(100, FOREST_STATE.pollinators + (Math.random() - 0.5) * 2));
        updateForestUI();
    }, 3000);

    setInterval(() => {
        const seasonIdx = SEASONS.indexOf(FOREST_STATE.season);
        FOREST_STATE.season = SEASONS[(seasonIdx + 1) % SEASONS.length];
        updateForestUI();
        if (typeof showBioToast === 'function') {
            showBioToast(`🍂 Season shifts to ${FOREST_STATE.season}`, 'info');
        }
    }, 60000);

    setInterval(() => {
        const phaseIdx = PHASES.indexOf(FOREST_STATE.phase);
        FOREST_STATE.phase = PHASES[(phaseIdx + 1) % PHASES.length];
        updateForestUI();
        document.body.style.transition = 'background 2s ease';
        const colors = { dawn: 'var(--forest-dark)', day: 'var(--forest)', twilight: 'var(--bark)', night: 'var(--dark)' };
        document.body.style.background = colors[FOREST_STATE.phase] || 'var(--dark)';
    }, 30000);
}

function updateForestUI() {
    const els = {
        canopy: document.getElementById('forestCanopy'),
        biodiversity: document.getElementById('forestBiodiversity'),
        water: document.getElementById('forestWater'),
        soil: document.getElementById('forestSoil'),
        pollinators: document.getElementById('forestPollinators'),
        season: document.getElementById('forestSeason'),
        phase: document.getElementById('forestPhase'),
    };

    if (els.canopy) { els.canopy.textContent = Math.round(FOREST_STATE.canopy); }
    if (els.biodiversity) { els.biodiversity.textContent = Math.round(FOREST_STATE.biodiversity); }
    if (els.water) { els.water.textContent = Math.round(FOREST_STATE.water); }
    if (els.soil) { els.soil.textContent = Math.round(FOREST_STATE.soil); }
    if (els.pollinators) { els.pollinators.textContent = Math.round(FOREST_STATE.pollinators); }
    if (els.season) { els.season.textContent = FOREST_STATE.season; }
    if (els.phase) { els.phase.textContent = FOREST_STATE.phase; }

    document.querySelectorAll('[data-forest-stat]').forEach(el => {
        const key = el.dataset.forestStat;
        if (FOREST_STATE[key] !== undefined) {
            el.style.width = `${FOREST_STATE[key]}%`;
        }
    });
}
