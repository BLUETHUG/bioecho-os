// BioEcho Time Machine — Organism Life Replay Engine
// Replay an organism's entire life history as a timeline.

class TimeMachine {
  constructor(twinEngine, localDB, identityLayer) {
    this.twinEngine = twinEngine;
    this.localDB = localDB;
    this.identityLayer = identityLayer;
    this.timeline = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.playSpeed = 1;
    this.organismId = null;
    this.playInterval = null;
  }

  async loadTimeline(organismId) {
    this.organismId = organismId;
    this.timeline = [];
    this.currentIndex = 0;

    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return this.timeline;

    const identity = this.twinEngine.getOrganismIdentity(organismId);

    this.timeline.push({
      index: 0, timestamp: twin.createdAt || Date.now() - 30 * 86400000,
      type: 'creation', label: 'Organism created',
      snapshot: { identity: identity || {}, state: {}, events: [] }
    });

    const events = (twin.events || []).sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      this.timeline.push({
        index: this.timeline.length, timestamp: event.timestamp,
        type: event.type || 'event', label: `${event.type || 'event'} — ${event.classification?.type || 'unknown'}`,
        snapshot: {
          state: event.state || {}, baseline: event.baseline,
          classification: event.classification, context: event.context
        }
      });
    }

    const stateHistory = this.twinEngine.getStageHistory(organismId);
    for (const transition of stateHistory) {
      this.timeline.push({
        index: this.timeline.length, timestamp: transition.time,
        type: 'lifecycle', label: `Stage: ${transition.stage}`,
        snapshot: { stage: transition.stage, from: transition.from }
      });
    }

    this.timeline.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < this.timeline.length; i++) this.timeline[i].index = i;

    return this.timeline;
  }

  play(speed) {
    if (this.timeline.length === 0) return;
    this.isPlaying = true;
    this.playSpeed = speed || 1;
    const interval = Math.max(100, 1000 / this.playSpeed);

    this.playInterval = setInterval(() => {
      if (!this.isPlaying || this.currentIndex >= this.timeline.length - 1) {
        this.pause();
        return;
      }
      this.currentIndex++;
    }, interval);
  }

  pause() {
    this.isPlaying = false;
    if (this.playInterval) { clearInterval(this.playInterval); this.playInterval = null; }
  }

  seekTo(timestamp) {
    for (let i = 0; i < this.timeline.length; i++) {
      if (this.timeline[i].timestamp >= timestamp) { this.currentIndex = i; return; }
    }
    this.currentIndex = this.timeline.length - 1;
  }

  seekToIndex(index) {
    this.currentIndex = Math.max(0, Math.min(this.timeline.length - 1, index));
  }

  getCurrentSnapshot() {
    if (this.timeline.length === 0) return null;
    return this.timeline[this.currentIndex] || null;
  }

  getSnapshotAt(timestamp) {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      if (this.timeline[i].timestamp <= timestamp) return this.timeline[i];
    }
    return this.timeline[0] || null;
  }

  getProgress() {
    if (this.timeline.length === 0) return 0;
    return this.currentIndex / (this.timeline.length - 1);
  }

  getTimelineSummary() {
    if (this.timeline.length === 0) return null;
    const first = this.timeline[0];
    const last = this.timeline[this.timeline.length - 1];
    return {
      organismId: this.organismId,
      totalEvents: this.timeline.length,
      startDate: first?.timestamp,
      endDate: last?.timestamp,
      durationDays: last && first ? Math.floor((last.timestamp - first.timestamp) / 86400000) : 0,
      lifecycleEvents: this.timeline.filter(t => t.type === 'lifecycle').length,
      signalEvents: this.timeline.filter(t => t.type === 'event' || t.type === 'spike').length
    };
  }

  async exportTimeline() {
    const summary = this.getTimelineSummary();
    return {
      format: 'bioecho-timemachine-v1',
      exportDate: Date.now(),
      summary,
      timeline: this.timeline.map(t => ({
        index: t.index, timestamp: t.timestamp, type: t.type, label: t.label,
        snapshot: t.snapshot
      }))
    };
  }

  getStats() {
    return {
      totalEvents: this.timeline.length,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      speed: this.playSpeed,
      progress: this.getProgress()
    };
  }
}
