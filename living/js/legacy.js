const MILESTONES = [
    { date: '2025-03-15', title: 'The First Seed', desc: 'BioEcho concept born — a vision for living digital ecosystems.' },
    { date: '2025-06-01', title: 'Echoes of the Forest', desc: 'First prototype with dynamic animal behaviors and environmental response.' },
    { date: '2025-09-10', title: 'Living World Scheduler', desc: 'Eight-phase day/night cycle with weather, seasons, and ecosystem health.' },
    { date: '2025-11-20', title: 'Underground Revealed', desc: 'Root systems, mycelium networks, and glowing fungi beneath the surface.' },
    { date: '2026-01-05', title: 'Companion Journal', desc: 'Virtual pet system rebuilt as a relationship-driven companion experience.' },
    { date: '2026-03-18', title: 'Six Worlds', desc: 'Forest, Lens, Animals, Earth, Lab, and Legacy — the full BioEcho experience.' },
    { date: '2026-07-17', title: 'Today', desc: 'BioEcho OS v2 — where nature meets intelligence.' },
];

const IMPACT = { users: 2847, companions: 4521, treesPlanted: 1247, memories: 18932 };

function initLegacy() {
    const timeline = document.getElementById('legacyTimeline');
    if (timeline) {
        timeline.innerHTML = MILESTONES.map((m, i) =>
            `<div class="legacy-milestone reveal" style="transition-delay:${i * 0.1}s">
                <div class="legacy-date">${m.date}</div>
                <div class="legacy-title">${m.title}</div>
                <div class="legacy-desc">${m.desc}</div>
            </div>`
        ).join('');
    }
    tickLegacy();
    setInterval(tickLegacy, 5000);
}

function tickLegacy() {
    IMPACT.users += Math.floor(Math.random() * 2);
    IMPACT.memories += Math.floor(Math.random() * 4);
    const m = { users: 'legacyUsers', companions: 'legacyCompanions', treesPlanted: 'legacyTreesPlanted', memories: 'legacyMemories' };
    Object.keys(m).forEach(k => { const el = document.getElementById(m[k]); if (el) el.textContent = IMPACT[k].toLocaleString(); });
}
