const LENS_ENTRIES = [
    { icon: '\uD83C\uDF3F', name: 'Fern', scientific: 'Polypodiopsida', desc: 'Ancient plant dating back 360 million years. Thrives in moist, shaded forest floors.' },
    { icon: '\uD83C\uDF3E', name: 'Moss', scientific: 'Bryophyta', desc: 'Non-vascular plant that absorbs water directly through leaves. Bioindicator of air quality.' },
    { icon: '\uD83C\uDF33', name: 'Oak', scientific: 'Quercus', desc: 'Hosts over 500 species of insects and fungi. A keystone species in temperate forests.' },
    { icon: '\uD83C\uDF3C', name: 'Wildflower', scientific: 'Various', desc: 'Early successional plants that support pollinator populations. Critical for ecosystem recovery.' },
    { icon: '\uD83C\uDF31', name: 'Seedling', scientific: 'Sporophyte', desc: 'The first stage of plant development. Represents regeneration and hope for the forest.' },
    { icon: '\uD83C\uDF42', name: 'Mushroom', scientific: 'Fungi', desc: 'The forest internet. Mycelium networks connect trees and transfer nutrients underground.' },
];

function initLens() {
    const container = document.getElementById('lensContainer');
    if (!container) return;
    container.innerHTML = LENS_ENTRIES.map((e, i) =>
        `<div class="lens-item reveal" style="transition-delay:${i * 0.08}s" data-idx="${i}">
            <div class="lens-icon">${e.icon}</div>
            <div class="lens-name">${e.name}</div>
            <div class="lens-sci">${e.scientific}</div>
        </div>`
    ).join('');
    container.querySelectorAll('.lens-item').forEach(el => {
        el.addEventListener('click', () => {
            const entry = LENS_ENTRIES[parseInt(el.dataset.idx)];
            if (entry) showLensDetail(entry);
        });
    });
}

function showLensDetail(entry) {
    const overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.innerHTML =
        `<div class="detail-content">
            <div class="detail-icon">${entry.icon}</div>
            <div class="detail-title">${entry.name}</div>
            <div class="detail-sci">${entry.scientific}</div>
            <div class="detail-desc">${entry.desc}</div>
            <button class="btn btn-outline" onclick="this.closest('.detail-overlay').remove()">Close</button>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
