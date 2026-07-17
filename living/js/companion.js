const SPECIES = {
    fox: { icon: '\uD83E\uDD8A', name: 'Fox', trait: 'Curious' },
    owl: { icon: '\uD83E\uDD89', name: 'Owl', trait: 'Wise' },
    deer: { icon: '\uD83E\uDD8C', name: 'Deer', trait: 'Gentle' },
    rabbit: { icon: '\uD83D\uDC07', name: 'Rabbit', trait: 'Playful' },
    bear: { icon: '\uD83D\uDC3B', name: 'Bear', trait: 'Loyal' },
    frog: { icon: '\uD83D\uDC38', name: 'Frog', trait: 'Resilient' },
    hedgehog: { icon: '\uD83E\uDDA4', name: 'Hedgehog', trait: 'Gentle' },
    squirrel: { icon: '\uD83D\uDC3F\uFE0F', name: 'Squirrel', trait: 'Energetic' },
    butterfly: { icon: '\uD83E\uDD8B', name: 'Butterfly', trait: 'Free' },
    wolf: { icon: '\uD83D\uDC3A', name: 'Wolf', trait: 'Fierce' },
};

const NAMES = {
    fox: ['Ember','Rusty','Vix','Sienna','Blaze','Kitsune'],
    owl: ['Hoot','Sage','Luna','Noctua','Solon','Athena'],
    deer: ['Bamboo','Willow','Hazel','Orin','Linden','Sylvia'],
    rabbit: ['Thumper','Clover','Mochi','Daisy','Nibbles','Basil'],
    bear: ['Koda','Bruno','Yogi','Tundra','Honey','Bjorn'],
    frog: ['Toad','Ribbit','Lily','Pond','Jade','Splash'],
    hedgehog: ['Spike','Pip','Quill','Nutmeg','Snuffles','Bramble'],
    squirrel: ['Chip','Nutty','Acorn','Hazel','Scamper','Twitch'],
    butterfly: ['Iris','Flutter','Moth','Bloom','Zephyr','Aura'],
    wolf: ['Shadow','Storm','Luna','Fenrir','Aspen','Echo'],
};

class Companion {
    constructor(species, name) {
        this.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
        this.species = species;
        this.name = name;
        this.bond = 0;
        this.health = 85 + Math.floor(Math.random() * 15);
        this.memories = [];
        this.lastUpdate = Date.now();
        this.createdAt = Date.now();
        this.addMemory('First Meeting', `You welcomed ${name} into the BioEcho world.`, 'milestone');
    }

    get info() { return SPECIES[this.species]; }
    get bondLabel() {
        if (this.bond >= 80) return 'Soulmate';
        if (this.bond >= 60) return 'Companion';
        if (this.bond >= 40) return 'Friend';
        if (this.bond >= 20) return 'Hatchling';
        return 'Acquaintance';
    }

    addMemory(title, desc, type) {
        this.memories.unshift({ id: 'm' + Date.now(), date: new Date().toISOString(), title, desc: desc || '', type: type || 'general' });
        if (this.memories.length > 20) this.memories.pop();
        this.save();
    }

    interact(type) {
        switch (type) {
            case 'observe': this.bond = Math.min(100, this.bond + 1); this.addMemory('Observation', `Spent time observing ${this.name}.`); break;
            case 'feed': this.health = Math.min(100, this.health + 5); this.bond = Math.min(100, this.bond + 2); this.addMemory('Feeding', `Provided nourishment for ${this.name}.`, 'care'); break;
            case 'train': this.bond = Math.min(100, this.bond + 2); this.addMemory('Training', `Practiced skills with ${this.name}.`, 'training'); break;
            case 'explore': this.bond = Math.min(100, this.bond + 3); this.health = Math.min(100, this.health + 3); this.addMemory('Exploration', `${this.name} explored new territory.`, 'adventure'); break;
            case 'rest': this.health = Math.min(100, this.health + 12); this.addMemory('Rest', `${this.name} rested peacefully.`, 'care'); break;
        }
        this.save();
        renderCompanions();
    }

    update() {
        const e = (Date.now() - this.lastUpdate) / 1000;
        this.lastUpdate = Date.now();
        if (e > 3600) this.health = Math.max(0, this.health - e * 0.008);
    }

    save() { saveCompanions(); }
    toJSON() { return { id: this.id, species: this.species, name: this.name, bond: this.bond, health: this.health, memories: this.memories, lastUpdate: this.lastUpdate, createdAt: this.createdAt }; }
    static fromJSON(d) { const c = new Companion(d.species, d.name); c.id = d.id; c.bond = d.bond; c.health = d.health; c.memories = d.memories || []; c.lastUpdate = d.lastUpdate; c.createdAt = d.createdAt; return c; }
}

let companions = [];

function initCompanions() {
    try { const d = localStorage.getItem('be_companions'); if (d) companions = JSON.parse(d).map(Companion.fromJSON); } catch {}
    if (companions.length === 0) {
        companions.push(new Companion('fox', 'Ember'));
        companions.push(new Companion('owl', 'Sage'));
    }
    renderCompanions();
    setInterval(() => { companions.forEach(c => c.update()); }, 15000);
}

function saveCompanions() {
    try { localStorage.setItem('be_companions', JSON.stringify(companions.map(c => c.toJSON()))); } catch {}
}

function renderCompanions() {
    const container = document.getElementById('companionContainer');
    if (!container) return;
    container.innerHTML = companions.map(c => {
        const info = c.info;
        const mem = c.memories[0];
        return `<div class="comp-card" data-id="${c.id}">
            <div class="comp-header">
                <div class="comp-avatar">${info.icon}</div>
                <div>
                    <div class="comp-name">${c.name}</div>
                    <div class="comp-species">${info.name} · ${info.trait} <span class="comp-bond">${c.bondLabel}</span></div>
                </div>
            </div>
            <div class="comp-stats">
                <div class="comp-stat"><div class="comp-stat-value">${Math.round(c.bond)}%</div><div class="comp-stat-label">Bond</div></div>
                <div class="comp-stat"><div class="comp-stat-value">${Math.round(c.health)}%</div><div class="comp-stat-label">Health</div></div>
            </div>
            <div class="progress" style="margin-bottom:0.75rem"><div class="progress-fill" style="width:${c.health}%"></div></div>
            <div class="comp-actions">
                <button class="btn btn-sm btn-ghost" data-action="observe">👁</button>
                <button class="btn btn-sm btn-ghost" data-action="feed">🍃</button>
                <button class="btn btn-sm btn-ghost" data-action="train">⚔</button>
                <button class="btn btn-sm btn-ghost" data-action="explore">🌍</button>
                <button class="btn btn-sm btn-ghost" data-action="rest">💤</button>
            </div>
            ${mem ? `<div class="comp-memory"><div class="comp-memory-date">${new Date(mem.date).toLocaleDateString()}</div>${mem.title}</div>` : ''}
        </div>`;
    }).join('');
    companions.forEach(c => {
        const el = document.querySelector(`.comp-card[data-id="${c.id}"]`);
        if (!el) return;
        el.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => c.interact(btn.dataset.action));
        });
    });
}

function addNewCompanion() {
    const keys = Object.keys(SPECIES);
    const s = keys[Math.floor(Math.random() * keys.length)];
    const names = NAMES[s];
    const c = new Companion(s, names[Math.floor(Math.random() * names.length)]);
    companions.push(c);
    saveCompanions();
    renderCompanions();
    if (typeof showToast === 'function') showToast(`${c.info.icon} ${c.name} the ${c.info.name} has joined!`, 'accent');
}

function showToast(msg, type) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'accent' ? 'var(--accent)' : 'var(--surface)'};color:var(--text);padding:12px 20px;border-radius:10px;font-size:0.85rem;z-index:9999;opacity:0;transform:translateY(16px);transition:all 0.3s var(--ease-out);box-shadow:0 8px 30px rgba(0,0,0,0.3);font-family:var(--font);max-width:360px`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(16px)'; setTimeout(() => t.remove(), 300); }, 3000);
}
