// BioEcho Citizen Science Engine
// Verified observations flow into research database. Trust is the product.

class CitizenScienceEngine {
  constructor(localDB, verificationChain, knowledgeGraph) {
    this.localDB = localDB;
    this.verification = verificationChain;
    this.kg = knowledgeGraph;
    this.submissions = new Map();
    this.reviews = new Map();
    this.badges = this._defineBadges();
  }

  async submitObservation(data) {
    const submission = {
      id: this._uuid(),
      userId: data.userId || 'local-user',
      organismId: data.organismId,
      speciesId: data.speciesId || null,
      timestamp: Date.now(),
      location: data.location || null,
      observationData: {
        signal: data.signal || null,
        classification: data.classification || null,
        notes: data.notes || '',
        photos: data.photos || [],
        features: data.features || {}
      },
      verificationLevel: 'raw',
      chainId: null,
      reviewCount: 0,
      reviewScore: 0,
      status: 'submitted',
      createdAt: Date.now()
    };

    if (data.sensorId) {
      const chain = await this.verification.createChain(
        submission.id, data.sensorId, data.calibration, data.dspPipeline
      );
      if (chain) {
        submission.chainId = chain.id;
        await this.verification.completeChain(chain.id, {
          valid: true,
          adjustedConfidence: data.confidence || 0.5
        });
        submission.verificationLevel = 'validated';
      }
    }

    this.submissions.set(submission.id, submission);
    await this._saveSubmission(submission);

    if (this.kg) {
      this.kg.addNode('Observation', submission.id, {
        organismId: submission.organismId,
        speciesId: submission.speciesId,
        userId: submission.userId,
        timestamp: submission.timestamp,
        level: submission.verificationLevel
      });
    }

    const stats = await this.getContributionStats(submission.userId);
    await this._checkBadges(submission.userId, stats);

    return { success: true, submission };
  }

  async reviewObservation(observationId, userId, verdict, notes) {
    const submission = this.submissions.get(observationId);
    if (!submission) return { success: false, error: 'Observation not found' };
    if (submission.userId === userId) return { success: false, error: 'Cannot review own observation' };

    const existingReview = Array.from(this.reviews.values())
      .find(r => r.observationId === observationId && r.userId === userId);
    if (existingReview) return { success: false, error: 'Already reviewed' };

    const review = {
      id: this._uuid(),
      observationId,
      userId,
      verdict,
      notes: notes || '',
      confidence: verdict === 'confirmed' ? 0.8 : verdict === 'disputed' ? 0.3 : 0.5,
      createdAt: Date.now()
    };

    this.reviews.set(review.id, review);
    submission.reviewCount++;
    submission.reviewScore += review.confidence;

    const avgScore = submission.reviewScore / submission.reviewCount;
    const canPromote = this.verification.canPromote(submission.verificationLevel, submission.reviewCount);
    if (canPromote) {
      submission.verificationLevel = canPromote;
    }

    await this._saveSubmission(submission);

    if (this.kg) {
      this.kg.addNode('Review', review.id, {
        observationId,
        userId,
        verdict,
        timestamp: review.createdAt
      });
      this.kg.addEdge('Review', review.id, 'Observation', observationId, 'VALIDATED_BY', {
        confidence: review.confidence
      });
    }

    const stats = await this.getContributionStats(userId);
    await this._checkBadges(userId, stats);

    return { success: true, review, newLevel: submission.verificationLevel };
  }

  async queryResearchDatabase(criteria) {
    const results = [];
    for (const [, sub] of this.submissions) {
      let match = true;
      if (criteria.speciesId && sub.speciesId !== criteria.speciesId) match = false;
      if (criteria.organismId && sub.organismId !== criteria.organismId) match = false;
      if (criteria.minLevel) {
        const reqLevel = this.verification.getLevel(criteria.minLevel);
        const subLevel = this.verification.getLevel(sub.verificationLevel);
        if (subLevel < reqLevel) match = false;
      }
      if (criteria.timeRange) {
        if (sub.timestamp < criteria.timeRange[0] || sub.timestamp > criteria.timeRange[1]) match = false;
      }
      if (match) results.push(sub);
    }
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getContributionStats(userId) {
    const userSubs = Array.from(this.submissions.values()).filter(s => s.userId === userId);
    const userReviews = Array.from(this.reviews.values()).filter(r => r.userId === userId);
    const verified = userSubs.filter(s => s.verificationLevel !== 'raw');
    const speciesSet = new Set(userSubs.map(s => s.speciesId).filter(Boolean));

    let reputation = 0;
    reputation += verified.length * 10;
    reputation += userReviews.length * 5;
    reputation += speciesSet.size * 20;
    const publishedCount = userSubs.filter(s => s.verificationLevel === 'published').length;
    reputation += publishedCount * 100;

    const badges = Array.from(this.badges.values())
      .filter(b => b.unlockedFor?.has(userId))
      .map(b => ({ id: b.id, name: b.name, description: b.description }));

    return {
      userId,
      totalObservations: userSubs.length,
      verifiedObservations: verified.length,
      speciesIdentified: Array.from(speciesSet),
      peerReviews: userReviews.length,
      reputationScore: reputation,
      badges,
      level: Math.floor(reputation / 100) + 1
    };
  }

  async linkToResearch(observationId, researchId, confidence) {
    const submission = this.submissions.get(observationId);
    if (!submission) return { success: false, error: 'Observation not found' };
    submission.researchLinks = submission.researchLinks || [];
    submission.researchLinks.push({ researchId, confidence: confidence || 0.5, linkedAt: Date.now() });
    await this._saveSubmission(submission);
    if (this.kg) {
      this.kg.addEdge('Observation', observationId, 'Research', researchId, 'PUBLISHED_IN', {
        confidence: confidence || 0.5
      });
    }
    return { success: true };
  }

  getStats() {
    const subs = Array.from(this.submissions.values());
    const reviews = Array.from(this.reviews.values());
    const levels = { raw: 0, validated: 0, peer_reviewed: 0, published: 0 };
    const speciesCounts = {};
    for (const s of subs) {
      levels[s.verificationLevel] = (levels[s.verificationLevel] || 0) + 1;
      if (s.speciesId) speciesCounts[s.speciesId] = (speciesCounts[s.speciesId] || 0) + 1;
    }
    return {
      totalSubmissions: subs.length,
      totalReviews: reviews.length,
      byLevel: levels,
      uniqueSpecies: Object.keys(speciesCounts).length,
      avgReviewScore: subs.length > 0 ? subs.reduce((a, s) => a + s.reviewScore, 0) / subs.length : 0
    };
  }

  _defineBadges() {
    return new Map([
      ['first_observation', { id: 'first_observation', name: 'First Observation', description: 'Submit your first observation', condition: (stats) => stats.totalObservations >= 1 }],
      ['species_pioneer', { id: 'species_pioneer', name: 'Species Pioneer', description: 'Identify 5 different species', condition: (stats) => stats.speciesIdentified.length >= 5 }],
      ['data_quality', { id: 'data_quality', name: 'Data Quality', description: '80%+ verification rate with 10+ observations', condition: (stats) => stats.totalObservations >= 10 && stats.verifiedObservations / stats.totalObservations >= 0.8 }],
      ['community_helper', { id: 'community_helper', name: 'Community Helper', description: 'Review 10 observations', condition: (stats) => stats.peerReviews >= 10 }],
      ['research_contributor', { id: 'research_contributor', name: 'Research Contributor', description: 'Get an observation published', condition: (stats) => stats.badges?.some(b => b.id === 'published') || false }],
      ['reputation_100', { id: 'reputation_100', name: 'Rising Scientist', description: 'Reach 100 reputation', condition: (stats) => stats.reputationScore >= 100 }],
      ['reputation_500', { id: 'reputation_500', name: 'Senior Researcher', description: 'Reach 500 reputation', condition: (stats) => stats.reputationScore >= 500 }],
      ['reputation_1000', { id: 'reputation_1000', name: 'Lead Scientist', description: 'Reach 1000 reputation', condition: (stats) => stats.reputationScore >= 1000 }]
    ]);
  }

  async _checkBadges(userId, stats) {
    for (const [id, badge] of this.badges) {
      if (badge.unlockedFor?.has(userId)) continue;
      if (badge.condition(stats)) {
        if (!badge.unlockedFor) badge.unlockedFor = new Set();
        badge.unlockedFor.add(userId);
      }
    }
  }

  async _saveSubmission(submission) {
    if (this.localDB) {
      try {
        const store = this.localDB.db?.transaction('observations', 'readwrite')?.objectStore('observations');
        if (store) store.put(submission);
      } catch {}
    }
  }

  _uuid() {
    return 'cs-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }
}
