const NAV_SECTIONS = ['hero', 'mission', 'forest', 'lens', 'companions', 'earth', 'lab', 'legacy'];

function initApp() {
    buildFloatNav();
    createHeroParticles();
    setupRevealObserver();
    setupScrollSpy();

    initForest();
    initLens();
    initCompanions();
    initEarth();
    initLab();
    initLegacy();
}

function buildFloatNav() {
    const nav = document.getElementById('floatNav');
    if (!nav) return;
    const labels = { hero: '00', mission: '01', forest: '02', lens: '03', companions: '04', earth: '05', lab: '06', legacy: '07' };
    nav.innerHTML = NAV_SECTIONS.map(id =>
        `<a href="#${id}" data-nav="${id}" class="${id === 'hero' ? 'active' : ''}"><span class="label">${labels[id] || id}</span></a>`
    ).join('');

    nav.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-nav]');
        if (link) {
            e.preventDefault();
            const id = link.dataset.nav;
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function createHeroParticles() {
    const container = document.getElementById('heroBg');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'hero-particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${10 + Math.random() * 15}s`;
        p.style.animationDelay = `${Math.random() * 12}s`;
        p.style.width = `${1.5 + Math.random() * 2.5}px`;
        p.style.height = p.style.width;
        p.style.opacity = `${0.2 + Math.random() * 0.3}`;
        container.appendChild(p);
    }
}

function setupRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function setupScrollSpy() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('[data-nav]').forEach(a => {
                    a.classList.toggle('active', a.dataset.nav === id);
                });
            }
        });
    }, { threshold: 0.3 });

    NAV_SECTIONS.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initApp);
