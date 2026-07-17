class Companion {
    constructor(species, name) {
        this.id = 'comp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        this.species = species;
        this.name = name;
        this.age = 0;
        this.relationship = 0;
        this.health = 100;
        this.training = 0;
        this.memories = [];
        this.adventures = [];
        this.favoritePlaces = [];
        this.lastUpdate = Date.now();
        this.createdAt = Date.now();
    }

    get speciesInfo() { return COMPANION_SPECIES[this.species]; }
    get icon() { return this.speciesInfo.icon; }
    get bondLabel() {
        if (this.relationship >= 80) return 'Soulmate';
        if (this.relationship >= 60) return 'Companion';
        if (this.relationship >= 40) return 'Friend';
        if (this.relationship >= 20) return 'Hatchling';
        return 'Acquaintance';
    }

    addMemory(title, description, type) {
        this.memories.unshift({
            id: 'mem_' + Date.now(),
            date: new Date().toISOString(),
            title,
            description,
            type: type || 'general',
            relationship: this.relationship
        });
        if (this.memories.length > 50) this.memories.pop();
        this.save();
    }

    addAdventure(title, location, description) {
        this.adventures.unshift({
            id: 'adv_' + Date.now(),
            date: new Date().toISOString(),
            title,
            location,
            description,
            completed: true
        });
        this.relationship = Math.min(100, this.relationship + 3);
        this.save();
    }

    addFavoritePlace(name, description) {
        if (!this.favoritePlaces.find(p => p.name === name)) {
            this.favoritePlaces.push({ name, description, addedAt: Date.now() });
            this.save();
        }
    }

    interact(type) {
        switch (type) {
            case 'observe':
                this.relationship = Math.min(100, this.relationship + 1);
                this.addMemory('Observation Session', `Spent time observing ${this.name} in their habitat.`, 'observation');
                break;
            case 'feed':
                this.health = Math.min(100, this.health + 8);
                this.relationship = Math.min(100, this.relationship + 2);
                this.addMemory('Feeding Time', `Provided nourishment for ${this.name}.`, 'care');
                break;
            case 'train':
                this.training = Math.min(100, this.training + 5);
                this.relationship = Math.min(100, this.relationship + 2);
                this.addMemory('Training Session', `Practiced skills with ${this.name}.`, 'training');
                break;
            case 'explore':
                this.relationship = Math.min(100, this.relationship + 3);
                this.health = Math.min(100, this.health + 3);
                this.addAdventure('Exploration', 'The wilderness', `${this.name} explored new territory.`);
                break;
            case 'rest':
                this.health = Math.min(100, this.health + 15);
                this.addMemory('Rest Day', `${this.name} rested and recovered.`, 'care');
                break;
        }
        this.save();
    }

    update() {
        const now = Date.now();
        const elapsed = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;
        this.age += elapsed / 86400;
        if (elapsed > 3600) {
            this.health = Math.max(0, this.health - elapsed * 0.01);
        }
    }

    toJSON() {
        return {
            id: this.id, species: this.species, name: this.name,
            age: this.age, relationship: this.relationship,
            health: this.health, training: this.training,
            memories: this.memories, adventures: this.adventures,
            favoritePlaces: this.favoritePlaces,
            lastUpdate: this.lastUpdate, createdAt: this.createdAt
        };
    }

    static fromJSON(data) {
        const c = new Companion(data.species, data.name);
        c.id = data.id;
        c.age = data.age;
        c.relationship = data.relationship;
        c.health = data.health;
        c.training = data.training;
        c.memories = data.memories || [];
        c.adventures = data.adventures || [];
        c.favoritePlaces = data.favoritePlaces || [];
        c.lastUpdate = data.lastUpdate;
        c.createdAt = data.createdAt;
        return c;
    }

    save() {
        const all = Companion.getAll();
        const idx = all.findIndex(c => c.id === this.id);
        if (idx >= 0) all[idx] = this.toJSON();
        else all.push(this.toJSON());
        localStorage.setItem('bioecho_companions', JSON.stringify(all));
    }

    static getAll() {
        try {
            const data = localStorage.getItem('bioecho_companions');
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    static loadAll() {
        return Companion.getAll().map(d => Companion.fromJSON(d));
    }

    static createDefault() {
        const species = Object.keys(COMPANION_SPECIES);
        const s = species[Math.floor(Math.random() * species.length)];
        const names = COMPANION_NAMES[s];
        const name = names[Math.floor(Math.random() * names.length)];
        const c = new Companion(s, name);
        c.addMemory('First Meeting', `You welcomed ${name} into the BioEcho world.`, 'milestone');
        c.save();
        return c;
    }
}

const COMPANION_SPECIES = {
    fox: { icon: '\uD83E\uDD8A', name: 'Fox', trait: 'Curious', color: '#E7A95A' },
    owl: { icon: '\uD83E\uDD89', name: 'Owl', trait: 'Wise', color: '#5FA8D3' },
    deer: { icon: '\uD83E\uDD8C', name: 'Deer', trait: 'Gentle', color: '#6FA36F' },
    rabbit: { icon: '\uD83D\uDC07', name: 'Rabbit', trait: 'Playful', color: '#BFDFF6' },
    bear: { icon: '\uD83D\uDC3B', name: 'Bear', trait: 'Loyal', color: '#6E5843' },
    frog: { icon: '\uD83D\uDC38', name: 'Frog', trait: 'Resilient', color: '#3E6B48' },
    hedgehog: { icon: '\uD83E\uDDA4', name: 'Hedgehog', trait: 'Gentle', color: '#8A6A4A' },
    squirrel: { icon: '\uD83D\uDC3F\uFE0F', name: 'Squirrel', trait: 'Energetic', color: '#A0522D' },
    butterfly: { icon: '\uD83E\uDD8B', name: 'Butterfly', trait: 'Free', color: '#E7A95A' },
    wolf: { icon: '\uD83D\uDC3A', name: 'Wolf', trait: 'Fierce', color: '#6E5843' },
};

const COMPANION_NAMES = {
    fox: ['Ember', 'Rusty', 'Vix', 'Sienna', 'Blaze', 'Kitsune'],
    owl: ['Hoot', 'Sage', 'Luna', 'Noctua', 'Solon', 'Athena'],
    deer: ['Bamboo', 'Willow', 'Hazel', 'Orin', 'Linden', 'Sylvia'],
    rabbit: ['Thumper', 'Clover', 'Mochi', 'Daisy', 'Nibbles', 'Basil'],
    bear: ['Koda', 'Bruno', 'Yogi', 'Tundra', 'Honey', 'Bjorn'],
    frog: ['Toad', 'Ribbit', 'Lily', 'Pond', 'Jade', 'Splash'],
    hedgehog: ['Spike', 'Pip', 'Quill', 'Nutmeg', 'Snuffles', 'Bramble'],
    squirrel: ['Chip', 'Nutty', 'Acorn', 'Hazel', 'Scamper', 'Twitch'],
    butterfly: ['Iris', 'Flutter', 'Moth', 'Bloom', 'Zephyr', 'Aura'],
    wolf: ['Shadow', 'Storm', 'Luna', 'Fenrir', 'Aspen', 'Echo'],
};

let companions = [];

function initCompanions() {
    const data = Companion.loadAll();
    if (data.length === 0) {
        companions = [Companion.createDefault(), Companion.createDefault()];
    } else {
        companions = data;
    }
    renderCompanions();
    setInterval(() => {
        companions.forEach(c => c.update());
        renderCompanions();
    }, 10000);
}

function renderCompanions() {
    const container = document.getElementById('companionContainer');
    if (!container) return;
    container.innerHTML = companions.map(c => renderCompanionCard(c)).join('');
    companions.forEach(c => attachCompanionEvents(c));
}

function renderCompanionCard(c) {
    const info = c.speciesInfo;
    const recentMemories = c.memories.slice(0, 3);
    return `
    <div class="bio-card ${c.health > 50 ? 'bio-card-leaf' : 'bio-card-bark'}" data-companion-id="${c.id}">
        <div class="companion-header">
            <div class="companion-avatar" style="background: radial-gradient(circle, ${info.color}33, transparent)">
                <span>${info.icon}</span>
            </div>
            <div>
                <div class="companion-name">${c.name}</div>
                <div class="companion-species">${info.name} · ${info.trait}</div>
                <span style="font-family:var(--font-mono);font-size:0.7rem;color:rgba(245,240,232,0.3)">
                    Bond: ${c.bondLabel} · Age: ${Math.floor(c.age)} days
                </span>
            </div>
            <div style="margin-left:auto;text-align:right">
                <span class="mission-badge ${c.health > 60 ? 'active' : 'upcoming'}">Health ${Math.round(c.health)}%</span>
                <div style="margin-top:0.5rem">
                    <span class="mission-badge ${c.relationship > 40 ? 'active' : 'upcoming'}">Bond ${Math.round(c.relationship)}%</span>
                </div>
            </div>
        </div>
        <div class="bio-grid-2" style="margin-bottom:1rem">
            <div class="companion-stat">
                <div class="companion-stat-value" style="color:var(--fern)">${Math.round(c.relationship)}%</div>
                <div class="companion-stat-label">Relationship</div>
            </div>
            <div class="companion-stat">
                <div class="companion-stat-value" style="color:var(--river)">${Math.round(c.training)}%</div>
                <div class="companion-stat-label">Training</div>
            </div>
        </div>
        <div class="bio-progress-vine" style="margin-bottom:1rem">
            <div class="fill" style="width:${c.health}%"></div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
            <button class="bio-btn bio-btn-sm bio-btn-seed" data-action="observe">👁 Observe</button>
            <button class="bio-btn bio-btn-sm bio-btn-leaf" data-action="feed">🍃 Feed</button>
            <button class="bio-btn bio-btn-sm bio-btn-stone" data-action="train">⚔ Train</button>
            <button class="bio-btn bio-btn-sm bio-btn-water" data-action="explore">🌍 Explore</button>
            <button class="bio-btn bio-btn-sm bio-btn-seed" data-action="rest">💤 Rest</button>
        </div>
        ${recentMemories.length > 0 ? `
        <div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:rgba(245,240,232,0.3);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em">
                Recent Memories
            </div>
            ${recentMemories.map(m => `
            <div class="memory-item" style="margin-bottom:0.5rem;padding:0.75rem">
                <div class="memory-date">${new Date(m.date).toLocaleDateString()}</div>
                <div class="memory-title" style="font-size:0.9rem">${m.title}</div>
                <div class="memory-desc">${m.description}</div>
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>`;
}

function attachCompanionEvents(c) {
    document.querySelectorAll(`[data-companion-id="${c.id}"] [data-action]`).forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            c.interact(action);
            renderCompanions();
        });
    });
}

function addNewCompanion() {
    const c = Companion.createDefault();
    companions.push(c);
    renderCompanions();
    if (typeof showBioToast === 'function') {
        showBioToast(`✨ ${c.name} the ${c.speciesInfo.name} has joined your world!`, 'success');
    }
}

function showBioToast(message, type) {
    const colors = { info: 'var(--river)', success: 'var(--fern)', warning: 'var(--sunset)', error: '#c0392b' };
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${colors[type]||colors.info};color:var(--dark);padding:12px 24px;border-radius:12px;font-size:14px;z-index:9999;opacity:0;transform:translateY(20px);transition:all 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:380px;font-family:var(--font-body);font-weight:500;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('companionContainer')) initCompanions();
});
