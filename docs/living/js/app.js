const APP = {
    currentSection: 'arrival',
    sections: ['arrival', 'seed', 'forest', 'lens', 'animals', 'earth', 'lab', 'legacy'],
    isTransitioning: false,
};

function initApp() {
    createArrivalParticles();
    setupNavigation();
    setupScrollSpy();
    updateBodyTheme();

    setTimeout(() => {
        document.getElementById('arrivalEnter')?.classList.add('visible');
    }, 1000);

    initForest();
    initLens();
    initCompanions();
    initEarth();
    initLab();
    initLegacy();
}

function createArrivalParticles() {
    const container = document.querySelector('.section-arrival');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'arrival-particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${8 + Math.random() * 12}s`;
        p.style.animationDelay = `${Math.random() * 10}s`;
        p.style.width = `${2 + Math.random() * 3}px`;
        p.style.height = p.style.width;
        p.style.background = [ 'var(--fern)', 'var(--river)', 'var(--sunset)', 'var(--cream)' ][Math.floor(Math.random() * 4)];
        container.appendChild(p);
    }
}

function setupNavigation() {
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = el.dataset.nav;
            navigateTo(target);
        });
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            e.preventDefault();
            const target = link.getAttribute('href').slice(1);
            if (target && document.getElementById(target)) {
                navigateTo(target);
            }
        }
    });
}

function navigateTo(sectionId) {
    if (APP.isTransitioning || APP.currentSection === sectionId) return;
    APP.isTransitioning = true;

    const target = document.getElementById(sectionId);
    if (!target) { APP.isTransitioning = false; return; }

    APP.currentSection = sectionId;
    updateActiveNav(sectionId);
    updateBodyTheme();

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
        APP.isTransitioning = false;
    }, 800);
}

function updateActiveNav(sectionId) {
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.toggle('active', el.dataset.nav === sectionId);
    });
}

function updateBodyTheme() {
    const themes = {
        arrival: 'dark',
        seed: 'forest-dark',
        forest: 'forest',
        lens: 'dark',
        animals: 'moss',
        earth: 'forest-dark',
        lab: 'dark-light',
        legacy: 'bark',
    };
    const theme = themes[APP.currentSection] || 'dark';
    document.body.dataset.theme = theme;
}

function setupScrollSpy() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                APP.currentSection = id;
                updateActiveNav(id);
                updateBodyTheme();
            }
        });
    }, { threshold: 0.3 });

    APP.sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initApp);
