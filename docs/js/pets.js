const PET_SPECIES = {
    fox: { icon: '\uD83E\uDD8A', name: 'Fox', desc: 'Clever and curious, loves puzzles' },
    owl: { icon: '\uD83E\uDD89', name: 'Owl', desc: 'Wise and watchful, enjoys quiet moments' },
    deer: { icon: '\uD83E\uDD8C', name: 'Deer', desc: 'Gentle and graceful, thrives in harmony' },
    rabbit: { icon: '\uD83D\uDC07', name: 'Rabbit', desc: 'Energetic and playful, loves attention' },
    bear: { icon: '\uD83D\uDC3B', name: 'Bear', desc: 'Strong and loyal, a gentle giant' },
    frog: { icon: '\uD83D\uDC38', name: 'Frog', desc: 'Small but mighty, enjoys the rain' },
    hedgehog: { icon: '\uD83E\uDDA4', name: 'Hedgehog', desc: 'Prickly outside, soft inside' },
    squirrel: { icon: '\uD83D\uDC3F\uFE0F', name: 'Squirrel', desc: 'Busy and quick, always collecting' },
};

const PET_NAMES = {
    fox: ['Ember', 'Rusty', 'Vix', 'Sienna', 'Blaze'],
    owl: ['Hoot', 'Sage', 'Luna', 'Noctua', 'Solon'],
    deer: ['Bamboo', 'Willow', 'Hazel', 'Orin', 'Linden'],
    rabbit: ['Thumper', 'Clover', 'Mochi', 'Daisy', 'Nibbles'],
    bear: ['Koda', 'Bruno', 'Yogi', 'Tundra', 'Honey'],
    frog: ['Toad', 'Ribbit', 'Lily', 'Pond', 'Jade'],
    hedgehog: ['Spike', 'Pip', 'Quill', 'Nutmeg', 'Snuffles'],
    squirrel: ['Chip', 'Nutty', 'Acorn', 'Hazel', 'Scamper'],
};

const BOND_LEVELS = [
    { min: 0, label: 'Egg', icon: '\uD83E\uDD5A', class: 'egg' },
    { min: 20, label: 'Hatchling', icon: '\uD83D\uDC23', class: 'hatchling' },
    { min: 40, label: 'Friend', icon: '\uD83E\uDD1D', class: 'friend' },
    { min: 60, label: 'Companion', icon: '\uD83D\uDC93', class: 'companion' },
    { min: 80, label: 'Soulmate', icon: '\u2728', class: 'soulmate' },
];

const THOUGHTS = {
    idle: ['...', 'Listening to the forest...', 'Sniffing the air...', 'Watching the light...'],
    happy: ['This is nice!', 'I love this!', 'So happy together!', '*purrs*'],
    hungry: ['When is snack time?', 'So hungry...', 'Got any food?'],
    sleepy: ['Getting sleepy...', '*yawn*', 'Time for a nap...'],
    sad: ['Feeling lonely...', 'Where did you go?', 'Miss you...'],
    excited: ['Wow! What is that?!', 'So much energy!', 'Let\'s go!'],
};

class Pet {
    constructor(species, name) {
        this.id = 'pet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        this.species = species;
        this.name = name;
        this.hunger = 30 + Math.floor(Math.random() * 30);
        this.energy = 50 + Math.floor(Math.random() * 30);
        this.happiness = 50 + Math.floor(Math.random() * 20);
        this.bond = 0;
        this.state = 'idle';
        this.lastUpdate = Date.now();
        this.adoptedAt = Date.now();
        this.thought = '';
        this.thoughtTimer = 0;
    }

    get speciesInfo() { return PET_SPECIES[this.species]; }
    get icon() { return this.speciesInfo.icon; }
    get bondLevel() {
        for (let i = BOND_LEVELS.length - 1; i >= 0; i--) {
            if (this.bond >= BOND_LEVELS[i].min) return BOND_LEVELS[i];
        }
        return BOND_LEVELS[0];
    }
    get bondLabel() { return this.bondLevel.label; }
    get bondClass() { return this.bondLevel.class; }
    get bondIcon() { return this.bondLevel.icon; }

    feed() {
        this.hunger = Math.min(100, this.hunger + 25);
        this.happiness = Math.min(100, this.happiness + 10);
        this.bond = Math.min(100, this.bond + 2);
        this.say('Yummy! Thank you!');
    }

    play() {
        if (this.energy < 10) {
            this.say('Too tired to play...');
            return;
        }
        this.happiness = Math.min(100, this.happiness + 20);
        this.energy = Math.max(0, this.energy - 15);
        this.hunger = Math.max(0, this.hunger - 5);
        this.bond = Math.min(100, this.bond + 3);
        this.say('That was fun!');
    }

    talk() {
        this.happiness = Math.min(100, this.happiness + 5);
        this.bond = Math.min(100, this.bond + 1);
        const messages = ['Listens carefully...', 'Tilts head curiously...', 'Makes a soft sound...', 'Nuzzles closer...'];
        this.say(messages[Math.floor(Math.random() * messages.length)]);
    }

    sleep() {
        this.energy = Math.min(100, this.energy + 30);
        this.hunger = Math.max(0, this.hunger - 8);
        this.say('Sleeping peacefully...');
    }

    say(text) {
        this.thought = text;
        this.thoughtTimer = 60;
    }

    update() {
        const now = Date.now();
        const elapsed = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        this.hunger = Math.max(0, this.hunger - elapsed * 0.3);
        this.energy = Math.max(0, this.energy - elapsed * 0.15);
        if (this.hunger < 30) {
            this.happiness = Math.max(0, this.happiness - elapsed * 0.2);
        }
        if (this.energy < 20) {
            this.happiness = Math.max(0, this.happiness - elapsed * 0.1);
        }
        this.happiness = Math.max(0, Math.min(100, this.happiness));

        if (this.hunger < 20) this.state = 'hungry';
        else if (this.energy < 15) this.state = 'sleepy';
        else if (this.happiness < 25) this.state = 'sad';
        else if (this.happiness > 80 && this.energy > 60) this.state = 'excited';
        else if (this.happiness > 60) this.state = 'happy';
        else this.state = 'idle';

        if (this.thoughtTimer > 0) {
            this.thoughtTimer--;
            if (this.thoughtTimer === 0) this.thought = '';
        }

        if (!this.thought && Math.random() < 0.005) {
            const pool = THOUGHTS[this.state] || THOUGHTS.idle;
            this.thought = pool[Math.floor(Math.random() * pool.length)];
            this.thoughtTimer = 80;
        }
    }

    toJSON() {
        return {
            id: this.id, species: this.species, name: this.name,
            hunger: this.hunger, energy: this.energy, happiness: this.happiness,
            bond: this.bond, state: this.state, lastUpdate: this.lastUpdate,
            adoptedAt: this.adoptedAt
        };
    }

    static fromJSON(data) {
        const p = new Pet(data.species, data.name);
        p.id = data.id;
        p.hunger = data.hunger;
        p.energy = data.energy;
        p.happiness = data.happiness;
        p.bond = data.bond;
        p.state = data.state;
        p.lastUpdate = data.lastUpdate;
        p.adoptedAt = data.adoptedAt;
        return p;
    }
}

let pets = [];
let selectedAdoptSpecies = 'fox';
let selectedPetId = null;

function savePets() {
    try {
        localStorage.setItem('bioecho_pets', JSON.stringify(pets.map(p => p.toJSON())));
    } catch (e) {}
}

function loadPets() {
    try {
        const data = localStorage.getItem('bioecho_pets');
        if (data) {
            const arr = JSON.parse(data);
            pets = arr.map(d => Pet.fromJSON(d));
        }
    } catch (e) {}
    if (pets.length === 0) {
        pets.push(new Pet('fox', 'Ember'));
        pets.push(new Pet('owl', 'Sage'));
        pets.push(new Pet('rabbit', 'Mochi'));
    }
    pets.forEach(p => p.lastUpdate = Date.now());
}

function renderPets() {
    const container = document.getElementById('petContainer');
    if (!container) return;
    container.innerHTML = pets.map(p => renderPetCard(p)).join('');
    pets.forEach(p => attachPetEvents(p));
}

function renderPetCard(p) {
    const hPct = Math.round(p.hunger);
    const ePct = Math.round(p.energy);
    const haPct = Math.round(p.happiness);
    const bPct = Math.round(p.bond);
    return `
    <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.1s">
      <div class="pet-card" data-pet-id="${p.id}">
        <div class="pet-avatar" style="background: linear-gradient(135deg, ${getSpeciesColor(p.species)}, ${getSpeciesColorLight(p.species)})">
          <span style="font-size: 4rem; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2))">${p.icon}</span>
          <span class="pet-status-badge ${p.state}">${p.state}</span>
          ${p.thought ? `<div class="pet-thought" style="opacity:1">${p.thought}</div>` : ''}
        </div>
        <div class="pet-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="pet-name">${p.name}</h5>
              <span class="pet-species">${p.speciesInfo.name}</span>
            </div>
            <span class="pet-bond-level ${p.bondClass}">${p.bondIcon} ${p.bondLabel}</span>
          </div>
          <div class="mt-3">
            <div class="pet-stat">
              <div class="pet-stat-label">
                <span>\uD83C\uDF54 Hunger</span>
                <span>${hPct}%</span>
              </div>
              <div class="pet-stat-bar"><div class="pet-stat-fill hunger" style="width:${hPct}%"></div></div>
            </div>
            <div class="pet-stat">
              <div class="pet-stat-label">
                <span>\u26A1 Energy</span>
                <span>${ePct}%</span>
              </div>
              <div class="pet-stat-bar"><div class="pet-stat-fill energy" style="width:${ePct}%"></div></div>
            </div>
            <div class="pet-stat">
              <div class="pet-stat-label">
                <span>\uD83D\uDE04 Happiness</span>
                <span>${haPct}%</span>
              </div>
              <div class="pet-stat-bar"><div class="pet-stat-fill happiness" style="width:${haPct}%"></div></div>
            </div>
            <div class="pet-stat">
              <div class="pet-stat-label">
                <span>\uD83D\uDC93 Bond</span>
                <span>${bPct}%</span>
              </div>
              <div class="pet-stat-bar"><div class="pet-stat-fill bond" style="width:${bPct}%"></div></div>
            </div>
          </div>
          <div class="pet-actions">
            <button class="pet-action-btn" data-action="feed" data-pet-id="${p.id}">
              <span class="emoji">\uD83C\uDF54</span> Feed
            </button>
            <button class="pet-action-btn" data-action="play" data-pet-id="${p.id}">
              <span class="emoji">\uD83C\uDFAE</span> Play
            </button>
            <button class="pet-action-btn" data-action="talk" data-pet-id="${p.id}">
              <span class="emoji">\uD83D\uDCAC</span> Talk
            </button>
            <button class="pet-action-btn" data-action="sleep" data-pet-id="${p.id}">
              <span class="emoji">\uD83D\uDCA4</span> Sleep
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function getSpeciesColor(species) {
    const colors = { fox: '#E7A95A', owl: '#5FA8D3', deer: '#6FA36F', rabbit: '#BFDFF6', bear: '#6E5843', frog: '#3E6B48', hedgehog: '#8A6A4A', squirrel: '#A0522D' };
    return colors[species] || '#0F3D2E';
}

function getSpeciesColorLight(species) {
    const colors = { fox: '#F5D4A0', owl: '#A0D0E8', deer: '#A0C8A0', rabbit: '#D8ECF8', bear: '#A09080', frog: '#70A080', hedgehog: '#B09070', squirrel: '#C08060' };
    return colors[species] || '#3E6B48';
}

function attachPetEvents(p) {
    document.querySelectorAll(`[data-pet-id="${p.id}"]`).forEach(el => {
        el.addEventListener('click', function (e) {
            const btn = e.target.closest('.pet-action-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            if (typeof p[action] === 'function') {
                p[action]();
                savePets();
                renderPets();
            }
        });
    });
}

function addRandomPet() {
    const speciesList = Object.keys(PET_SPECIES);
    const species = speciesList[Math.floor(Math.random() * speciesList.length)];
    const names = PET_NAMES[species];
    const name = names[Math.floor(Math.random() * names.length)];
    const pet = new Pet(species, name);
    pets.push(pet);
    savePets();
    renderPets();
    if (typeof showToast === 'function') {
        showToast(`Adopted a new ${pet.speciesInfo.name} named ${pet.name}!`, 'success');
    }
}

const PET_CARE_INTERVAL = 5000;

function startPetCareLoop() {
    setInterval(() => {
        pets.forEach(p => p.update());
        savePets();
        renderPets();
    }, PET_CARE_INTERVAL);
}

function initPets() {
    loadPets();
    renderPets();
    startPetCareLoop();
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('petContainer')) {
        initPets();
    }
});
