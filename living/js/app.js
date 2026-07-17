const TOTAL_SCENES = 8;
let currentScene = 0;
let sceneData = {};

const SCENE_LABELS = [
    '00 \u2014 Arrival', '01 \u2014 Mission', '02 \u2014 Forest', '03 \u2014 Lens',
    '04 \u2014 Companions', '05 \u2014 Earth', '06 \u2014 Lab', '07 \u2014 Legacy'
];

const STATUS_LABELS = [
    'forest breathing', 'listening', 'canopy rustling', 'focusing',
    'companions resting', 'planet turning', 'processing', 'remembering'
];

// ========== BOOT ==========
document.addEventListener('DOMContentLoaded', () => {
    buildNav();
    bindKeyboard();
    initAll();
    setTimeout(dismissLoader, 2200);
});

function dismissLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    loader.style.transition = 'opacity 0.75s cubic-bezier(0.22,1,0.36,1)';
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 800);
}

// ========== NAVIGATION ==========
function buildNav() {
    const nav = document.getElementById('uiNav');
    if (!nav) return;
    nav.innerHTML = Array.from({ length: TOTAL_SCENES }, (_, i) =>
        `<a href="#" data-scene="${i}" class="${i === 0 ? 'active' : ''}"><span class="nav-label">${String(i).padStart(2, '0')}</span></a>`
    ).join('');
    nav.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-scene]');
        if (link) { e.preventDefault(); goTo(parseInt(link.dataset.scene)); }
    });
}

function goTo(idx) {
    if (idx === currentScene || idx < 0 || idx >= TOTAL_SCENES) return;
    document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
    const next = document.querySelector(`.scene[data-scene="${idx}"]`);
    if (next) next.classList.add('active');
    document.querySelectorAll('[data-scene]').forEach(el => el.classList.toggle('active', parseInt(el.dataset.scene) === idx));
    currentScene = idx;
    const label = document.getElementById('sceneLabel');
    if (label) label.textContent = SCENE_LABELS[idx] || '';
    const status = document.getElementById('statusLabel');
    if (status) status.textContent = STATUS_LABELS[idx] || '';
}

function navigateScene(idx) { goTo(idx); }

function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentScene + 1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentScene - 1);
    });
}

// ========== INIT ALL ==========
function initAll() {
    initForest();
    initLens();
    initCompanions();
    initEarth();
    initLab();
    initLegacy();
}

// ========== FOREST ==========
const FOREST_DATA = { canopy: 78, biodiversity: 64, water: 82, soil: 71, pollinators: 59, season: 'summer' };
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

function initForest() {
    tickForest();
    setInterval(() => {
        ['canopy','biodiversity','water','soil','pollinators'].forEach(k => {
            FOREST_DATA[k] = Math.max(0, Math.min(100, FOREST_DATA[k] + (Math.random() - 0.5) * 1.5));
        });
        tickForest();
    }, 3000);
    setInterval(() => {
        FOREST_DATA.season = SEASONS[(SEASONS.indexOf(FOREST_DATA.season) + 1) % 4];
        tickForest();
    }, 60000);
}

function tickForest() {
    const map = { canopy: 'fCanopy', biodiversity: 'fBiodiversity', water: 'fWater', soil: 'fSoil', pollinators: 'fPollinators', season: 'fSeason' };
    Object.keys(map).forEach(k => {
        const el = document.getElementById(map[k]);
        if (!el) return;
        if (k === 'season') el.textContent = FOREST_DATA[k];
        else el.textContent = Math.round(FOREST_DATA[k]) + '%';
    });
}

// ========== LENS ==========
const LENS_DATA = [
    { icon: '\uD83C\uDF3F', name: 'Fern', sci: 'Polypodiopsida', desc: 'Ancient plant, 360M years. Thrives in moist forest floors.' },
    { icon: '\uD83C\uDF3E', name: 'Moss', sci: 'Bryophyta', desc: 'Absorbs water through leaves. Bioindicator of air quality.' },
    { icon: '\uD83C\uDF33', name: 'Oak', sci: 'Quercus', desc: 'Hosts 500+ species. A keystone in temperate forests.' },
    { icon: '\uD83C\uDF3C', name: 'Flower', sci: 'Various', desc: 'Supports pollinator populations. Critical for recovery.' },
    { icon: '\uD83C\uDF31', name: 'Seedling', sci: 'Sporophyte', desc: 'First stage of growth. Represents regeneration.' },
    { icon: '\uD83C\uDF42', name: 'Fungus', sci: 'Fungi', desc: 'Forest internet. Mycelium connects trees underground.' },
];

function initLens() {
    const grid = document.getElementById('lensGrid');
    if (!grid) return;
    grid.innerHTML = LENS_DATA.map((e, i) =>
        `<div class="click" style="padding:0.75rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border);transition:all var(--fast) var(--ease)" data-idx="${i}"
              onmouseenter="this.style.background='var(--surface-hover)'" onmouseleave="this.style.background='var(--surface)'" onclick="showLensDetail(${i})">
            <div style="font-size:1.2rem">${e.icon}</div>
            <div style="font-size:0.65rem;font-weight:var(--font-weight-regular);margin-top:0.25rem">${e.name}</div>
            <div style="font-size:0.5rem;color:var(--text-tertiary)">${e.sci}</div>
        </div>`
    ).join('');
}

function showLensDetail(idx) {
    const e = LENS_DATA[idx];
    if (!e) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(160,165,177,0.85);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.4s;padding:2rem';
    overlay.innerHTML =
        `<div style="max-width:400px;width:100%;text-align:center">
            <div style="font-size:3rem;margin-bottom:1rem">${e.icon}</div>
            <div style="font-size:1.1rem;font-weight:var(--font-weight-regular);margin-bottom:0.25rem">${e.name}</div>
            <div style="font-size:0.65rem;color:var(--text-secondary);margin-bottom:1rem">${e.sci}</div>
            <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.6;margin-bottom:1.5rem">${e.desc}</p>
            <button class="btn btn-outline btn-sm" onclick="this.closest('div[style]').remove()">Close</button>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');
    overlay.addEventListener('click', (e2) => { if (e2.target === overlay) overlay.remove(); });
}

// ========== COMPANIONS ==========
const COMP_SPECIES = {
    fox: { icon: '\uD83E\uDD8A', name: 'Fox' }, owl: { icon: '\uD83E\uDD89', name: 'Owl' },
    deer: { icon: '\uD83E\uDD8C', name: 'Deer' }, rabbit: { icon: '\uD83D\uDC07', name: 'Rabbit' },
    bear: { icon: '\uD83D\uDC3B', name: 'Bear' }, frog: { icon: '\uD83D\uDC38', name: 'Frog' },
    hedgehog: { icon: '\uD83E\uDDA4', name: 'Hedgehog' }, squirrel: { icon: '\uD83D\uDC3F\uFE0F', name: 'Squirrel' },
    butterfly: { icon: '\uD83E\uDD8B', name: 'Butterfly' }, wolf: { icon: '\uD83D\uDC3A', name: 'Wolf' },
};
const COMP_NAMES = {
    fox: ['Ember','Rusty','Vix','Sienna','Blaze'], owl: ['Hoot','Sage','Luna','Noctua','Solon'],
    deer: ['Bamboo','Willow','Hazel','Orin','Linden'], rabbit: ['Thumper','Clover','Mochi','Daisy','Nibbles'],
    bear: ['Koda','Bruno','Yogi','Tundra','Honey'], frog: ['Toad','Ribbit','Lily','Pond','Jade'],
    hedgehog: ['Spike','Pip','Quill','Nutmeg','Snuffles'], squirrel: ['Chip','Nutty','Acorn','Hazel','Scamper'],
    butterfly: ['Iris','Flutter','Moth','Bloom','Zephyr'], wolf: ['Shadow','Storm','Luna','Fenrir','Aspen'],
};

let companions = [];

function initCompanions() {
    try { const d = localStorage.getItem('be_comp'); if (d) companions = JSON.parse(d); } catch {}
    if (companions.length === 0) {
        companions.push(makeComp('fox', 'Ember'));
        companions.push(makeComp('owl', 'Sage'));
    }
    renderCompanions();
}

function makeComp(species, name) {
    return { id: 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), species, name, bond: 0, health: 85+Math.floor(Math.random()*15), memories: [{date:Date.now(),t:'First Meeting'}], lastUpdate: Date.now() };
}

function renderCompanions() {
    const g = document.getElementById('companionGrid');
    if (!g) return;
    g.innerHTML = companions.map(c => {
        const info = COMP_SPECIES[c.species] || { icon: '?', name: '?' };
        const mem = c.memories && c.memories[0];
        return `<div style="padding:0.75rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
                <span style="font-size:1.3rem">${info.icon}</span>
                <div>
                    <div style="font-size:0.75rem;font-weight:var(--font-weight-regular)">${c.name}</div>
                    <div style="font-size:0.55rem;color:var(--text-tertiary)">${info.name}</div>
                </div>
                <span style="margin-left:auto;font-size:0.5rem;padding:0.15rem 0.4rem;border-radius:var(--radius-sm);background:var(--accent-glow);color:var(--accent)">${bondLabel(c.bond)}</span>
            </div>
            <div style="display:flex;gap:0.5rem;font-size:0.6rem;color:var(--text-secondary);margin-bottom:0.5rem">
                <span>Bond: ${Math.round(c.bond)}%</span>
                <span>Health: ${Math.round(c.health)}%</span>
            </div>
            <div style="display:flex;gap:0.3rem">
                ${['observe','feed','train','explore','rest'].map(a => `<button class="btn btn-sm btn-ghost" onclick="compInteract('${c.id}','${a}')">${a[0].toUpperCase()}</button>`).join('')}
            </div>
            ${mem ? `<div style="font-size:0.55rem;color:var(--text-tertiary);margin-top:0.4rem">${mem.t}</div>` : ''}
        </div>`;
    }).join('');
}

function bondLabel(b) { if (b>=80) return 'Soulmate'; if (b>=60) return 'Companion'; if (b>=40) return 'Friend'; if (b>=20) return 'Hatchling'; return 'Acquaintance'; }

function compInteract(id, action) {
    const c = companions.find(x => x.id === id);
    if (!c) return;
    switch (action) {
        case 'observe': c.bond = Math.min(100, c.bond+1); c.memories.unshift({date:Date.now(),t:'Observed patiently'}); break;
        case 'feed': c.health = Math.min(100, c.health+5); c.bond = Math.min(100, c.bond+2); c.memories.unshift({date:Date.now(),t:'Fed and nourished'}); break;
        case 'train': c.bond = Math.min(100, c.bond+2); c.memories.unshift({date:Date.now(),t:'Training session'}); break;
        case 'explore': c.bond = Math.min(100, c.bond+3); c.health = Math.min(100, c.health+3); c.memories.unshift({date:Date.now(),t:'Explored together'}); break;
        case 'rest': c.health = Math.min(100, c.health+12); c.memories.unshift({date:Date.now(),t:'Rested peacefully'}); break;
    }
    if (c.memories.length > 20) c.memories.pop();
    saveComps(); renderCompanions();
}

function addCompanion() {
    const keys = Object.keys(COMP_SPECIES);
    const s = keys[Math.floor(Math.random()*keys.length)];
    const names = COMP_NAMES[s];
    const c = makeComp(s, names[Math.floor(Math.random()*names.length)]);
    companions.push(c); saveComps(); renderCompanions();
}

function saveComps() { try { localStorage.setItem('be_comp', JSON.stringify(companions)); } catch {} }

// ========== EARTH ==========
const EARTH_DATA = { trees: 1247, missions: 89, citizens: 342, carbon: 45.6 };
const MISSIONS = [
    { t: 'Reforest the Ridge', s: 'active', p: 34 },
    { t: 'Pollinator Corridor', s: 'active', p: 62 },
    { t: 'Waterway Cleanup', s: 'upcoming', p: 0 },
    { t: 'Night Survey', s: 'done', p: 100 },
];

function initEarth() {
    tickEarth();
    setInterval(() => { EARTH_DATA.trees += Math.floor(Math.random()*2); EARTH_DATA.carbon += Math.random()*0.3; tickEarth(); }, 10000);
}

function tickEarth() {
    const m = { trees: 'eTrees', missions: 'eMissions', citizens: 'eCitizens', carbon: 'eCarbon' };
    Object.keys(m).forEach(k => { const el = document.getElementById(m[k]); if (el) el.textContent = typeof EARTH_DATA[k] === 'number' && !Number.isInteger(EARTH_DATA[k]) ? EARTH_DATA[k].toFixed(1) : (EARTH_DATA[k]).toLocaleString(); });
    const g = document.getElementById('missionGrid');
    if (!g) return;
    g.innerHTML = MISSIONS.map(m =>
        `<div style="padding:0.6rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border);text-align:left">
            <div style="font-size:0.55rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.15rem">${m.s}</div>
            <div style="font-size:0.7rem;font-weight:var(--font-weight-regular)">${m.t}</div>${m.s === 'active' ? `<div style="height:2px;background:var(--border);border-radius:1px;margin-top:0.4rem"><div style="height:100%;width:${m.p}%;background:var(--accent);border-radius:1px"></div></div>` : ''}
        </div>`
    ).join('');
}

// ========== LAB ==========
const EXPERIMENTS = [
    { t: 'Soil Microbiome', s: 'running', p: 67 },
    { t: 'Pollinator Frequency', s: 'running', p: 43 },
    { t: 'Acoustic Biodiversity', s: 'done', p: 100 },
    { t: 'Mycelium Mapping', s: 'paused', p: 28 },
];

function initLab() {
    renderExperiments();
    const canvas = document.getElementById('sigCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; };
    resize(); window.addEventListener('resize', resize);
    let phase = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width, h = canvas.height, mid = h/2;
        ctx.beginPath(); ctx.strokeStyle = 'rgba(45,107,79,0.15)'; ctx.lineWidth = 2;
        for (let x = 0; x < w; x++) { const t = x/w*Math.PI*8+phase; const y = mid+Math.sin(t)*12+Math.sin(t*2.3)*6+Math.sin(t*0.7)*10; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
        ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = 'rgba(45,107,79,0.3)'; ctx.lineWidth = 1;
        for (let x = 0; x < w; x++) { const t = x/w*Math.PI*8+phase; const y = mid+Math.sin(t)*12+Math.sin(t*2.3)*6+Math.sin(t*0.7)*10; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
        ctx.stroke();
        phase += 0.025;
        requestAnimationFrame(draw);
    }
    draw();
}

function renderExperiments() {
    const g = document.getElementById('experimentGrid');
    if (!g) return;
    g.innerHTML = EXPERIMENTS.map(e =>
        `<div style="padding:0.6rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border);text-align:left">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
                <span style="font-size:0.7rem;font-weight:var(--font-weight-regular)">${e.t}</span>
                <span style="font-size:0.5rem;padding:0.1rem 0.35rem;border-radius:var(--radius-sm);background:var(--accent-glow);color:var(--accent)">${e.s}</span>
            </div>
            <div style="height:2px;background:var(--border);border-radius:1px"><div style="height:100%;width:${e.p}%;background:var(--accent);border-radius:1px"></div></div>
        </div>`
    ).join('');
}

// ========== LEGACY ==========
const MILESTONES = [
    { d: '2025-03', t: 'The First Seed', s: 'Concept born' },
    { d: '2025-06', t: 'Echoes of the Forest', s: 'First prototype' },
    { d: '2025-09', t: 'Living Scheduler', s: 'Day/night + weather' },
    { d: '2025-11', t: 'Underground', s: 'Root systems revealed' },
    { d: '2026-01', t: 'Companion Journal', s: 'Relationship-driven pets' },
    { d: '2026-03', t: 'Six Worlds', s: 'Full BioEcho experience' },
    { d: '2026-07', t: 'Today', s: 'Where nature meets intelligence' },
];

const IMPACT = { users: 2847, companions: 4521, trees: 1247, memories: 18932 };

function initLegacy() {
    const list = document.getElementById('legacyList');
    if (list) {
        list.innerHTML = MILESTONES.map(m =>
            `<div style="padding:0.5rem 0;border-bottom:1px solid var(--border);display:flex;gap:0.75rem;align-items:baseline">
                <span style="font-size:0.55rem;color:var(--text-tertiary);flex-shrink:0">${m.d}</span>
                <span style="font-size:0.75rem;font-weight:var(--font-weight-regular)">${m.t}</span>
                <span style="font-size:0.55rem;color:var(--text-secondary)">${m.s}</span>
            </div>`
        ).join('');
    }
    tickLegacy();
    setInterval(tickLegacy, 5000);
}

function tickLegacy() {
    IMPACT.users += Math.floor(Math.random()*2);
    IMPACT.memories += Math.floor(Math.random()*4);
    const m = { users: 'lUsers', companions: 'lCompanions', trees: 'lTrees', memories: 'lMemories' };
    Object.keys(m).forEach(k => { const el = document.getElementById(m[k]); if (el) el.textContent = IMPACT[k].toLocaleString(); });
}

// ========== GLOBAL EXPOSURE ==========
window.navigateScene = navigateScene;
window.showLensDetail = showLensDetail;
window.addCompanion = addCompanion;
window.compInteract = compInteract;
