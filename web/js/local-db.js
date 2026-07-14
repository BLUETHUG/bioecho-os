// BioEcho Local Database — IndexedDB-based persistent storage
// Stores organisms, events, experiments, photos, weather, conversations.

class LocalDB {
  constructor() {
    this.dbName = 'bioecho-db';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Organisms store
        if (!db.objectStoreNames.contains('organisms')) {
          const org = db.createObjectStore('organisms', { keyPath: 'id' });
          org.createIndex('species', 'species', { unique: false });
          org.createIndex('type', 'type', { unique: false });
        }

        // Events store (spike events, classifications)
        if (!db.objectStoreNames.contains('events')) {
          const ev = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
          ev.createIndex('organismId', 'organismId', { unique: false });
          ev.createIndex('time', 'time', { unique: false });
          ev.createIndex('classification', 'classification', { unique: false });
          ev.createIndex('organismId_time', ['organismId', 'time'], { unique: false });
        }

        // Experiments store
        if (!db.objectStoreNames.contains('experiments')) {
          const exp = db.createObjectStore('experiments', { keyPath: 'id' });
          exp.createIndex('organismId', 'organismId', { unique: false });
          exp.createIndex('startTime', 'startTime', { unique: false });
        }

        // Life events store (meaningful milestones)
        if (!db.objectStoreNames.contains('life_events')) {
          const le = db.createObjectStore('life_events', { keyPath: 'id', autoIncrement: true });
          le.createIndex('organismId', 'organismId', { unique: false });
          le.createIndex('time', 'time', { unique: false });
        }

        // Weather/environment snapshots
        if (!db.objectStoreNames.contains('environment')) {
          const env = db.createObjectStore('environment', { keyPath: 'id', autoIncrement: true });
          env.createIndex('time', 'time', { unique: false });
        }

        // Conversations (chat history)
        if (!db.objectStoreNames.contains('conversations')) {
          const conv = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
          conv.createIndex('organismId', 'organismId', { unique: false });
          conv.createIndex('time', 'time', { unique: false });
        }

        // Photos
        if (!db.objectStoreNames.contains('photos')) {
          const photo = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
          photo.createIndex('organismId', 'organismId', { unique: false });
          photo.createIndex('time', 'time', { unique: false });
        }

        // Relationships
        if (!db.objectStoreNames.contains('relationships')) {
          const rel = db.createObjectStore('relationships', { keyPath: 'id' });
          rel.createIndex('userId', 'userId', { unique: false });
          rel.createIndex('organismId', 'organismId', { unique: false });
        }
      };

      req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Generic CRUD helpers
  async _put(store, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async _get(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _getAllByIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _delete(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async _count(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ─── Organisms ──────────────────────────────────────────

  async saveOrganism(organism) { await this._put('organisms', organism); }
  async getOrganism(id) { return this._get('organisms', id); }
  async getAllOrganisms() { return this._getAll('organisms'); }
  async deleteOrganism(id) { await this._delete('organisms', id); }

  // ─── Events ─────────────────────────────────────────────

  async saveEvent(event) {
    const data = { ...event, id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
    await this._put('events', data);
    return data;
  }

  async getEventsByOrganism(organismId, limit = 100) {
    const events = await this._getAllByIndex('events', 'organismId', organismId);
    return events.sort((a,b) => b.time - a.time).slice(0, limit);
  }

  async getEventsByTimeRange(organismId, startTime, endTime) {
    const events = await this._getAllByIndex('events', 'organismId', organismId);
    return events.filter(e => e.time >= startTime && e.time <= endTime).sort((a,b) => a.time - b.time);
  }

  async getEventCount(organismId) {
    const events = await this._getAllByIndex('events', 'organismId', organismId);
    return events.length;
  }

  // ─── Experiments ────────────────────────────────────────

  async saveExperiment(experiment) { await this._put('experiments', experiment); }
  async getExperiment(id) { return this._get('experiments', id); }
  async getExperimentsByOrganism(organismId) {
    return this._getAllByIndex('experiments', 'organismId', organismId);
  }

  // ─── Life Events ────────────────────────────────────────

  async saveLifeEvent(lifeEvent) {
    const data = { ...lifeEvent, id: lifeEvent.id || `le-${Date.now()}` };
    await this._put('life_events', data);
    return data;
  }

  async getLifeEventsByOrganism(organismId) {
    return this._getAllByIndex('life_events', 'organismId', organismId);
  }

  // ─── Environment ────────────────────────────────────────

  async saveEnvironmentSnapshot(snapshot) {
    const data = { ...snapshot, id: snapshot.id || `env-${Date.now()}` };
    await this._put('environment', data);
    return data;
  }

  async getEnvironmentHistory(limit = 100) {
    const all = await this._getAll('environment');
    return all.sort((a,b) => b.time - a.time).slice(0, limit);
  }

  // ─── Conversations ──────────────────────────────────────

  async saveConversation(message) {
    const data = { ...message, id: message.id || `msg-${Date.now()}` };
    await this._put('conversations', data);
    return data;
  }

  async getConversationHistory(organismId, limit = 50) {
    const msgs = await this._getAllByIndex('conversations', 'organismId', organismId);
    return msgs.sort((a,b) => b.time - a.time).slice(0, limit);
  }

  // ─── Photos ─────────────────────────────────────────────

  async savePhoto(photo) {
    const data = { ...photo, id: photo.id || `photo-${Date.now()}` };
    await this._put('photos', data);
    return data;
  }

  async getPhotosByOrganism(organismId) {
    return this._getAllByIndex('photos', 'organismId', organismId);
  }

  // ─── Relationships ──────────────────────────────────────

  async saveRelationship(rel) { await this._put('relationships', rel); }
  async getRelationship(id) { return this._get('relationships', id); }
  async getRelationshipsByUser(userId) { return this._getAllByIndex('relationships', 'userId', userId); }
  async getRelationshipsByOrganism(organismId) { return this._getAllByIndex('relationships', 'organismId', organismId); }

  // ─── Export ─────────────────────────────────────────────

  async exportOrganismData(organismId) {
    const organism = await this.getOrganism(organismId);
    const events = await this.getEventsByOrganism(organismId, 10000);
    const lifeEvents = await this.getLifeEventsByOrganism(organismId);
    const experiments = await this.getExperimentsByOrganism(organismId);
    const photos = await this.getPhotosByOrganism(organismId);
    const conversations = await this.getConversationHistory(organismId, 1000);

    return {
      exportDate: new Date().toISOString(),
      organism,
      events,
      lifeEvents,
      experiments,
      photos,
      conversations,
      stats: {
        totalEvents: events.length,
        totalLifeEvents: lifeEvents.length,
        totalExperiments: experiments.length,
        totalPhotos: photos.length,
        totalMessages: conversations.length
      }
    };
  }

  // ─── Stats ──────────────────────────────────────────────

  async getStats() {
    return {
      organisms: await this._count('organisms'),
      events: await this._count('events'),
      experiments: await this._count('experiments'),
      lifeEvents: await this._count('life_events'),
      environment: await this._count('environment'),
      conversations: await this._count('conversations'),
      photos: await this._count('photos'),
      relationships: await this._count('relationships')
    };
  }
}
