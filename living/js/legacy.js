const LEGACY_MILESTONES = [
    { date: '2025-03-15', title: 'The First Seed', desc: 'BioEcho concept born — a vision for living digital ecosystems.' },
    { date: '2025-06-01', title: 'Echoes of the Forest', desc: 'First prototype with dynamic animal behaviors and environmental response.' },
    { date: '2025-09-10', title: 'Living World Scheduler', desc: 'Eight-phase day/night cycle with weather, seasons, and ecosystem health.' },
    { date: '2025-11-20', title: 'Underground Revealed', desc: 'Root systems, mycelium networks, and glowing fungi discovered beneath the surface.' },
    { date: '2026-01-05', title: 'Companion Journal', desc: 'Virtual pet system rebuilt as a relationship-driven companion experience.' },
    { date: '2026-03-18', title: 'Six Worlds', desc: 'Forest, Lens, Animals, Earth, Lab, and Legacy — the full BioEcho experience.' },
    { date: '2026-07-17', title: 'Today', desc: 'BioEcho OS v2 — where nature meets intelligence.' },
];

const LEGACY_IMPACT = {
    users: 2847,
    companions: 4521,
    treesPlanted: 1247,
    memories: 18932,
    researchHours: 8432,
};

function initLegacy() {
    const container = document.getElementById('legacyTimeline');
    if (container) {
        container.innerHTML = LEGACY_MILESTONES.map((m, i) => `
            <div class="legacy-milestone animate-in-up" style="animation-delay:${i * 0.15}s">
                <div class="legacy-date">${m.date}</div>
                <div class="legacy-title">${m.title}</div>
                <div class="legacy-desc">${m.desc}</div>
            </div>
        `).join('');
    }

    updateLegacyImpact();
    setInterval(updateLegacyImpact, 5000);
}

function updateLegacyImpact() {
    LEGACY_IMPACT.users += Math.floor(Math.random() * 2);
    LEGACY_IMPACT.memories += Math.floor(Math.random() * 5);

    Object.keys(LEGACY_IMPACT).forEach(key => {
        const el = document.getElementById(`legacy${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (el) {
            el.textContent = LEGACY_IMPACT[key].toLocaleString();
        }
    });
}
