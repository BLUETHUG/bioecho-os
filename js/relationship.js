// BioEcho Relationship Engine
// Tracks relationships between users, organisms, and environment.
// This is what makes BioEcho understand context, not just data.

class RelationshipEngine {
  constructor() {
    this.relationships = new Map();
    this.habits = new Map();
    this._load();
  }

  // Create a relationship between a user and an organism
  createRelationship(userId, organismId, type = 'owner', metadata = {}) {
    const id = `${userId}-${organismId}`;
    const rel = {
      id,
      userId,
      organismId,
      type, // 'owner', 'caretaker', 'observer', 'researcher'
      createdAt: Date.now(),
      metadata: {
        name: metadata.name || '',        // what the user calls the organism
        nickname: metadata.nickname || '',
        adoptionDate: metadata.adoptionDate || null,
        rescueDate: metadata.rescueDate || null,
        birthday: metadata.birthday || null,
        vetClinic: metadata.vetClinic || null,
        vetPhone: metadata.vetPhone || null,
        ...metadata
      },
      activities: [],    // recent activities
      habits: {},        // learned habits
      milestones: [],    // important dates
      notes: []
    };
    this.relationships.set(id, rel);
    this._save();
    return rel;
  }

  getRelationship(userId, organismId) {
    return this.relationships.get(`${userId}-${organismId}`);
  }

  getRelationshipsForUser(userId) {
    return Array.from(this.relationships.values()).filter(r => r.userId === userId);
  }

  getRelationshipsForOrganism(organismId) {
    return Array.from(this.relationships.values()).filter(r => r.organismId === organismId);
  }

  // Record an activity (feeding, watering, walking, vet visit, etc.)
  recordActivity(relationshipId, type, details = {}) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return;

    const activity = {
      time: Date.now(),
      type, // 'watering', 'feeding', 'walk', 'vet_visit', 'pruning', 'observation', 'photo', 'training'
      details
    };
    rel.activities.push(activity);
    if (rel.activities.length > 500) rel.activities.shift();

    // Update habit tracking
    this._updateHabit(rel, type);

    this._save();
    return activity;
  }

  // Learn habits from activity patterns
  _updateHabit(rel, activityType) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    if (!rel.habits[activityType]) {
      rel.habits[activityType] = {
        count: 0,
        lastTime: null,
        avgInterval: null,
        preferredHour: null,
        preferredDays: [],
        streak: 0
      };
    }

    const habit = rel.habits[activityType];
    const lastTime = habit.lastTime;

    habit.count++;
    habit.lastTime = Date.now();

    // Calculate interval
    if (lastTime) {
      const interval = Date.now() - lastTime;
      habit.avgInterval = habit.avgInterval
        ? (habit.avgInterval * 0.8 + interval * 0.2)  // exponential moving average
        : interval;
    }

    // Preferred hour (exponential moving average)
    habit.preferredHour = habit.preferredHour !== null
      ? habit.preferredHour * 0.9 + hour * 0.1
      : hour;

    // Preferred days
    if (!habit.preferredDays.includes(dayOfWeek)) {
      habit.preferredDays.push(dayOfWeek);
      if (habit.preferredDays.length > 7) habit.preferredDays.shift();
    }

    // Streak calculation
    const oneDayMs = 86400000;
    if (lastTime && (Date.now() - lastTime) < oneDayMs * 1.5) {
      habit.streak++;
    } else if (!lastTime || (Date.now() - lastTime) > oneDayMs * 2) {
      habit.streak = 1;
    }
  }

  // Get habit recommendations based on learned patterns
  getRecommendations(relationshipId) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return [];

    const recommendations = [];
    const now = Date.now();
    const oneDayMs = 86400000;

    for (const [type, habit] of Object.entries(rel.habits)) {
      if (!habit.lastTime || !habit.avgInterval) continue;

      const timeSinceLastActivity = now - habit.lastTime;
      const expectedNext = habit.lastTime + habit.avgInterval;

      // Overdue check
      if (timeSinceLastActivity > habit.avgInterval * 1.3) {
        const hoursOverdue = (timeSinceLastActivity - habit.avgInterval) / 3600000;
        recommendations.push({
          type: 'overdue',
          activity: type,
          message: `${type.replace('_', ' ')} is overdue by ${hoursOverdue.toFixed(1)} hours`,
          urgency: hoursOverdue > 12 ? 'high' : hoursOverdue > 4 ? 'medium' : 'low',
          lastActivity: habit.lastTime,
          streak: habit.streak
        });
      }

      // Upcoming reminder
      if (timeSinceLastActivity > habit.avgInterval * 0.8) {
        const hoursUntil = (expectedNext - now) / 3600000;
        if (hoursUntil > 0 && hoursUntil < 4) {
          recommendations.push({
            type: 'upcoming',
            activity: type,
            message: `${type.replace('_', ' ')} expected in ${hoursUntil.toFixed(1)} hours`,
            urgency: 'low'
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
    });
  }

  // Add a milestone (first flowering, vet visit, adoption anniversary, etc.)
  addMilestone(relationshipId, type, date, description) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return;
    rel.milestones.push({ type, date, description, createdAt: Date.now() });
    this._save();
  }

  // Get upcoming milestones
  getUpcomingMilestones(relationshipId, daysAhead = 30) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return [];

    const now = Date.now();
    const cutoff = now + daysAhead * 86400000;

    return rel.milestones
      .filter(m => {
        const mDate = new Date(m.date).getTime();
        return mDate >= now && mDate <= cutoff;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Add a note
  addNote(relationshipId, text) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return;
    rel.notes.push({ text, time: Date.now() });
    if (rel.notes.length > 200) rel.notes.shift();
    this._save();
  }

  // Get activity summary
  getActivitySummary(relationshipId, days = 7) {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return null;

    const cutoff = Date.now() - days * 86400000;
    const recent = rel.activities.filter(a => a.time > cutoff);

    const byType = {};
    for (const a of recent) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }

    return {
      totalActivities: recent.length,
      byType,
      days,
      avgPerDay: recent.length / days,
      lastActivity: recent.length > 0 ? recent[recent.length - 1] : null
    };
  }

  _save() {
    try {
      const data = {};
      this.relationships.forEach((v, k) => { data[k] = v; });
      localStorage.setItem('bioecho_relationships', JSON.stringify(data));
    } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('bioecho_relationships');
      if (raw) {
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([k, v]) => this.relationships.set(k, v));
      }
    } catch {}
  }
}
