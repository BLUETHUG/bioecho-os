const LENS_ENTRIES = [
    { icon: '\uD83C\uDF3F', name: 'Fern', scientific: 'Polypodiopsida', desc: 'Ancient plant dating back 360 million years. Thrives in moist, shaded forest floors.', color: '#6FA36F' },
    { icon: '\uD83C\uDF3E', name: 'Moss', scientific: 'Bryophyta', desc: 'Non-vascular plant that absorbs water directly through leaves. Bioindicator of air quality.', color: '#3E6B48' },
    { icon: '\uD83C\uDF33', name: 'Oak', scientific: 'Quercus', desc: 'Hosts over 500 species of insects and fungi. A keystone species in temperate forests.', color: '#6E5843' },
    { icon: '\uD83C\uDF3C', name: 'Wildflower', scientific: 'Various', desc: 'Early successional plants that support pollinator populations. Critical for ecosystem recovery.', color: '#E7A95A' },
    { icon: '\uD83C\uDF31', name: 'Seedling', scientific: 'Sporophyte', desc: 'The first stage of plant development. Represents regeneration and hope for the forest.', color: '#8FC48F' },
    { icon: '\uD83C\uDF42', name: 'Mushroom', scientific: 'Fungi', desc: 'The forest internet. Mycelium networks connect trees and transfer nutrients underground.', color: '#8A6A4A' },
];

let lensActive = false;
let lensTarget = null;

function initLens() {
    const container = document.getElementById('lensContainer');
    if (!container) return;
    container.innerHTML = LENS_ENTRIES.map((entry, i) => `
        <div class="lens-item" data-lens-index="${i}" style="animation-delay:${i * 0.1}s">
            <div class="lens-item-icon">${entry.icon}</div>
            <div class="lens-item-label">${entry.name}</div>
            <div class="lens-item-desc"><em>${entry.scientific}</em></div>
        </div>
    `).join('');

    container.querySelectorAll('.lens-item').forEach(el => {
        el.addEventListener('click', function () {
            const idx = parseInt(this.dataset.lensIndex);
            const entry = LENS_ENTRIES[idx];
            showLensDetail(entry);
        });
    });
}

function showLensDetail(entry) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:1000;
        background:rgba(0,0,0,0.8);
        backdrop-filter:blur(10px);
        display:flex;align-items:center;justify-content:center;
        opacity:0;transition:opacity 0.4s ease;
        padding:2rem;
    `;
    overlay.innerHTML = `
        <div style="max-width:500px;width:100%;text-align:center">
            <div style="font-size:5rem;margin-bottom:1rem">${entry.icon}</div>
            <h2 style="color:var(--cream);margin-bottom:0.5rem">${entry.name}</h2>
            <p style="font-family:var(--font-mono);color:${entry.color};font-size:0.85rem;margin-bottom:1.5rem">${entry.scientific}</p>
            <p style="color:rgba(245,240,232,0.7);line-height:1.8;margin-bottom:2rem">${entry.desc}</p>
            <button class="bio-btn bio-btn-leaf" onclick="this.closest('div[style]').parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}
