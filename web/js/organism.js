// BioEcho Organism Manager — UI for the plant/animal list

class OrganismUI {
  constructor(containerId, manager) {
    this.container = document.getElementById(containerId);
    this.manager = manager;
    this.manager.onChange = () => this.render();
  }

  render() {
    const summaries = this.manager.getAllSummaries();
    this.container.innerHTML = '';
    for (const s of summaries) {
      const el = document.createElement('div');
      el.className = 'organism-item' + (s.id === this.manager.activePlantId ? ' active' : '');
      const dotClass = s.healthScore > 0.8 ? 'ok' : s.healthScore > 0.5 ? 'warn' : 'critical';
      el.innerHTML = `<span class="organism-dot ${dotClass}"></span><span>${s.name}</span>`;
      el.dataset.id = s.id;
      el.addEventListener('click', () => {
        this.manager.setActive(s.id);
        // Update chart titles etc
        document.getElementById('signal-source-label').textContent = s.name;
        this.render();
      });
      this.container.appendChild(el);
    }
  }
}
