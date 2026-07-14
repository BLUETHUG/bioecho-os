# BioEcho OS — Full Platform Execution Plan

## Executive Summary

This plan covers building all 15 platform capabilities for BioEcho OS. The work is organized into 6 phases over approximately 6 months of focused development. Each phase builds on the previous and produces a deployable increment.

**Current State:** 10-engine client-side architecture with working DSP, evidence validation, digital twin, relationships, and environment engines. Backend scaffolded but not connected. No graph structure, no persistent identity, no cross-entity linking.

**Target State:** A biological intelligence platform with a knowledge graph, camera-first UX, citizen science capabilities, predictive intelligence, and a third-party SDK.

---

## Phase 1: Living Identity Layer + Data Foundation (Weeks 1-4)

**Goal:** Every organism gets a persistent, evolving identity with full lifecycle history. This is the primary key for everything else.

### 1.1 Redesign Data Models

**Current Problem:** Data is duplicated across engines (twin.events, localDB.events, experimentLog.events). No single source of truth. No state history.

**Solution:** Unified data model with IndexedDB as primary local store.

```
OrganismIdentity {
  id: UUID (deterministic, survives export/import)
  name: string
  speciesId: string (FK to Species entity)
  type: "plant" | "animal" | "fungus" | "insect" | "other"
  
  // Lifecycle
  lifecycleStage: "germination" | "seedling" | "vegetative" | "mature" | "flowering" | "fruiting" | "senescent" | "dormant" | "deceased"
  birthDate: number | null
  acquisitionDate: number | null
  deathDate: number | null
  
  // Lineage
  parentOrganismId: UUID | null
  propagationMethod: "seed" | "cutting" | "division" | "grafting" | "spore" | "unknown"
  
  // Location
  location: {
    latitude: number | null
    longitude: number | null
    indoor: boolean
    container: string | null  // "pot", "garden bed", "field"
    climateZone: string | null
  }
  
  // State (current snapshot)
  state: {
    healthScore: number
    stressIndex: number
    spikeRate: number
    growthRate: number
    energyBalance: number
    electricalSignature: number[]
  }
  
  // Identity metadata
  createdAt: number
  updatedAt: number
  version: number
  checksum: string  // for data integrity verification
}
```

### 1.2 State History (Time-Series)

**Current Problem:** Only latest state is kept. Previous states are lost.

**Solution:** Record state snapshots at configurable intervals.

```
StateSnapshot {
  id: UUID
  organismId: UUID
  timestamp: number
  state: { healthScore, stressIndex, spikeRate, growthRate, energyBalance }
  baseline: { amplitude, freq, noise }
  delta: { /* change from previous snapshot */ }
  trigger: "periodic" | "event" | "manual"
}
```

- Record snapshot every 5 minutes during active monitoring
- Record snapshot on significant events (stress detection, user action)
- Record snapshot on manual request
- Query: "what was the health score 3 weeks ago?"

### 1.3 Lifecycle Management

**New Engine:** `lifecycle.js` — Tracks organism lifecycle stages, triggers alerts for transitions.

```
LifecycleEngine {
  getCurrentStage(organismId): LifecycleStage
  getStageHistory(organismId): StageTransition[]
  predictNextStage(organismId): { stage, estimatedDate, confidence }
  getSeasonalBehavior(organismId, season): SeasonalProfile
  recordTransition(organismId, from, to, trigger)
}
```

### 1.4 Provenance Chain

**Current Problem:** No way to verify how an observation was obtained.

**Solution:** Every event gets a full provenance chain.

```
Provenance {
  eventId: UUID
  sensorId: string
  sensorCalibration: { score, timestamp }
  dspPipeline: { filters, threshold, version }
  evidenceValidation: { valid, artifacts, adjustedConfidence }
  classificationEngine: { version, modelHash }
  timestamp: number
  deviceFingerprint: string
  checksum: string  // hash of entire provenance chain
}
```

### 1.5 Multi-Device Identity Resolution

**Current Problem:** IDs are ephemeral. No way to identify the same organism across devices.

**Solution:** Deterministic UUID generation from organism attributes + user salt.

```
generateOrganismId(name, speciesId, userId, birthDate): UUID
// Same inputs always produce the same UUID
// Enables offline-first with eventual consistency
```

### Deliverables
- [ ] Unified data model in IndexedDB (replaces duplicated stores)
- [ ] StateSnapshot recording and querying
- [ ] Lifecycle engine with stage tracking
- [ ] Provenance chain on every event
- [ ] Deterministic organism ID generation
- [ ] Data export/import that preserves identity and relationships

---

## Phase 2: Universal Knowledge Graph (Weeks 5-10)

**Goal:** Connect all entities — organisms, species, environment, research, sensors, users — into a queryable graph.

### 2.1 Graph Data Model

**Entity Types (Nodes):**

| Entity | Fields | Source |
|--------|--------|--------|
| Organism | (from Phase 1) | Local DB |
| Species | id, scientificName, commonName, family, order, kingdom, electrophysiologyProfile, distribution, habitat, conservationStatus | Local DB + API |
| Environment | id, name, type, coordinates, climateZone, soilType, vegetation, microclimate | Local DB |
| Sensor | id, type, model, serialNumber, calibrationHistory, firmwareVersion, capabilities | Local DB |
| User | id, name, email, preferences, location | PostgreSQL |
| Research | id, title, authors, doi, year, journal, findings, species, signalTypes | API |
| Event | (from Phase 1) | Local DB |
| Experiment | (from Phase 1) | Local DB |
| Stimulus | id, type, intensity, duration, automated, source | Local DB |
| Observation | id, userId, organismId, timestamp, data, verified | Local DB |

**Relationship Types (Edges):**

| Edge | From → To | Properties |
|------|-----------|------------|
| BELONGS_TO | Organism → Species | confidence |
| OCCURS_IN | Organism → Environment | startDate, endDate, position |
| MONITORS | Sensor → Organism | startDate, endDate, electrodePosition |
| CAPTURED_BY | Event → Sensor | calibrationSessionId |
| TRIGGERED_BY | Event → Stimulus | latency |
| FOLLOWS | Event → Event | timeDelta, causalConfidence |
| INFLUENCES | Environment → Event | correlationStrength |
| PUBLISHED_IN | Finding → Research | doi, page |
| PROPAGATED_FROM | Organism → Organism | method, date |
| CO_LOCATED | Organism → Organism | environmentId, distance |
| OBSERVED_BY | Observation → User | role |
| VALIDATED_BY | Event → Experiment | session |

### 2.2 Graph Storage

**Local (IndexedDB):** Lightweight adjacency list for client-side traversal.

```
GraphNode {
  id: UUID
  type: string
  data: object
  version: number
  updatedAt: number
}

GraphEdge {
  id: UUID
  from: UUID
  to: UUID
  type: string
  properties: object
  weight: number
  createdAt: number
}
```

**Backend (PostgreSQL + JSONB):** Full graph with GIN indexes for fast traversal.

```sql
CREATE TABLE graph_nodes (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE graph_edges (
  id UUID PRIMARY KEY,
  from_id UUID REFERENCES graph_nodes(id),
  to_id UUID REFERENCES graph_nodes(id),
  type VARCHAR(50) NOT NULL,
  properties JSONB,
  weight REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edges_from ON graph_edges(from_id);
CREATE INDEX idx_edges_to ON graph_edges(to_id);
CREATE INDEX idx_edges_type ON graph_edges(type);
CREATE INDEX idx_nodes_type ON graph_nodes(type);
```

### 2.3 Graph Query Engine

**Local (JS):** In-memory graph traversal for real-time queries.

```javascript
class GraphQuery {
  // Traverse from a node
  traverse(nodeId, edgeType, direction, depth): GraphPath[]
  
  // Find shortest path between two nodes
  findPath(fromId, toId, maxDepth): GraphPath | null
  
  // Find all nodes of a type matching criteria
  findNodes(type, criteria): GraphNode[]
  
  // Aggregate across the graph
  aggregate(nodeType, edgeType, aggregation): any
  
  // Pattern matching
  matchPattern(pattern): Match[]
  
  // Temporal graph queries
  queryTemporal(nodeId, timeRange, edgeType): GraphPath[]
}
```

**Backend (Rust):** PostgreSQL recursive CTEs for complex traversals.

### 2.4 Species Entity

**Current Problem:** Hardcoded in-memory map. Not queryable, not extensible.

**Solution:** Full species entity with taxonomic hierarchy and electrophysiology profiles.

```
Species {
  id: string  // "epipremnum-aureum"
  scientificName: string
  commonNames: string[]
  taxonomy: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
    species: string
  }
  electrophysiology: {
    voltageRange: [min, max]
    typicalSpikeDuration: [min, max]
    typicalRiseTime: [min, max]
    dominantFreqRange: [min, max]
    recoveryTime: number
    rhythm: "diurnal" | "nocturnal" | "continuous"
    knownResponses: {
      [stimulusType]: { amplitudeChange, freqChange, latency }
    }
  }
  ecology: {
    habitat: string[]
    distribution: string[]
    conservationStatus: string  // IUCN Red List category
    pollinator: string | null
    seasonalBehavior: {
      [season]: { activity, dormancy, flowering, fruiting }
    }
  }
  careRequirements: {
    light: string
    water: string
    temperature: [min, max]
    humidity: [min, max]
    soil: string
  }
}
```

### 2.5 Environment Entity

**Current Problem:** Inline context data. Not spatially indexed. Not linked to organisms.

**Solution:** Spatial environment entity with microclimate tracking.

```
Environment {
  id: UUID
  name: string
  type: "indoor" | "outdoor" | "greenhouse" | "laboratory"
  coordinates: { latitude, longitude }
  elevation: number | null
  climateZone: string  // Köppen classification
  soilType: string | null
  vegetation: string[]
  microclimate: {
    temperatureRange: [min, max]
    humidityRange: [min, max]
    lightProfile: "full_sun" | "partial_shade" | "shade" | "artificial"
    windExposure: "exposed" | "sheltered" | "enclosed"
  }
  linkedOrganisms: UUID[]
  sensorDeployments: UUID[]
}
```

### 2.6 Research Entity

**Current Problem:** Scientific references are inline strings. Not linked to observations.

**Solution:** Research knowledge base linked to observations.

```
Research {
  id: UUID
  title: string
  authors: string[]
  doi: string | null
  year: number
  journal: string
  abstract: string
  findings: {
    species: string[]
    signalTypes: string[]
    keyResults: string[]
    equations: string[]
  }
  linkedEvents: UUID[]  // events that match this research's findings
  confidence: number  // how well our data matches this research
}
```

### 2.7 Graph Population

**Auto-populate from existing data:**
- Every organism → BELONGS_TO → species
- Every event → CAPTURED_BY → sensor
- Every experiment → VALIDATED_BY → events
- Every organism → OCCURS_IN → environment
- Every user → OBSERVED_BY → organisms

### Deliverables
- [ ] Graph node and edge schemas in IndexedDB
- [ ] Graph query engine (local traversal)
- [ ] Species entity with taxonomy and electrophysiology
- [ ] Environment entity with spatial data
- [ ] Research entity with findings
- [ ] Graph population from existing data
- [ ] Backend PostgreSQL graph schema
- [ ] Graph sync protocol (local → backend)

---

## Phase 3: BioEcho Lens + Camera-First UX (Weeks 7-12)

**Goal:** Camera becomes the homepage. Point at anything → see everything.

### 3.1 Camera Integration

**New File:** `web/js/lens.js`

```javascript
class BioEchoLens {
  constructor() {
    this.video = null
    this.canvas = null
    this.recognitionModel = null
    this.arOverlay = null
  }
  
  async initialize()
  async startCapture()
  async captureFrame(): ImageData
  async recognizeSubject(frame): RecognitionResult
  async overlayData(subject, data): ARDisplay
  async explainSubject(subject): ExplanationChain
  async getTimeline(subject): Timeline
  async getRecommendations(subject): Recommendation[]
}
```

### 3.2 Subject Recognition

**Approach:** Multi-modal recognition combining:
1. **Visual:** Camera image → species identification (via ML model or API)
2. **Electrical:** If sensor connected → signal pattern matching
3. **Context:** Location + time + season → narrow possibilities

**Recognition Pipeline:**
```
Camera Frame
  → Image Segmentation ( isolate subject )
  → Species Classification ( leaf shape, flower, bark, animal features )
  → Cross-reference with SpeciesDB
  → If sensor connected: match electrical signature
  → Return: Species, confidence, linked data
```

### 3.3 AR Overlay System

**Display layers on camera view:**
1. **Identity:** Species name, individual name (if registered)
2. **Health:** Real-time health score, stress indicators
3. **Activity:** Recent events, spike rate, classification
4. **Environment:** Temperature, humidity, light level
5. **Timeline:** Mini-timeline of recent events
6. **Actions:** Quick buttons (log activity, take photo, start monitoring)

### 3.4 Recognition Sources

**For plants:**
- Visual: Leaf shape, flower, growth pattern
- Electrical: Signal amplitude, frequency, response pattern
- Context: Location, season, care history

**For animals:**
- Visual: Species identification (collar, breed, markings)
- Audio: Bark, meow, bird song (via microphone)
- Context: Location, time of day, activity pattern

**For environments:**
- Visual: Landscape, garden, room
- Sensors: Temperature, humidity, light
- Context: GPS coordinates, weather data

### 3.5 One-Scan Workflow

```
Open App → Camera Opens → Recognize → Overlay → Explain → Act

Point at leaf:
  → "Epipremnum aureum (Pothos)"
  → Health: 0.87 (Good)
  → Last watered: 2 days ago
  → Recent activity: 3 resting-state signals today
  → Recommendation: Water within 24 hours
  → [Start Monitoring] [Log Activity] [View Timeline] [Chat]

Point at dog:
  → "Golden Retriever (registered as 'Max')"
  → Activity level: Normal
  → Last walk: 4 hours ago
  → Vet visit due: 2 weeks
  → [Start Monitoring] [Log Walk] [Emergency] [View History]
```

### Deliverables
- [ ] Camera integration (getUserMedia)
- [ ] Image capture and processing pipeline
- [ ] Species recognition (visual + electrical + contextual)
- [ ] AR overlay system
- [ ] One-scan workflow
- [ ] Integration with existing engines (twin, context, meaning, relationship)

---

## Phase 4: Citizen Science + Verification Engine (Weeks 11-16)

**Goal:** Verified observations flow into a research database. Trust is the product.

### 4.1 Verification & Provenance Engine

**Every observation gets a full provenance chain:**

```
VerificationChain {
  observationId: UUID
  steps: [
    { step: "sensor_capture", timestamp, sensorId, calibration, rawDataHash },
    { step: "dsp_processing", timestamp, pipeline, filters, version },
    { step: "feature_extraction", timestamp, features, algorithm },
    { step: "evidence_validation", timestamp, valid, artifacts, adjustedConfidence },
    { step: "classification", timestamp, model, version, confidence },
    { step: "context_enrichment", timestamp, environment, history },
    { step: "ai_interpretation", timestamp, explanation, references },
    { step: "user_confirmation", timestamp, userId, action }
  ]
  overallConfidence: number
  verificationLevel: "raw" | "validated" | "peer_reviewed" | "published"
  checksum: string  // hash of entire chain
  signature: string | null  // cryptographic signature (future)
}
```

### 4.2 Verification Levels

| Level | Requirements | Use Case |
|-------|-------------|----------|
| **Raw** | Sensor data captured | Personal use |
| **Validated** | Evidence validation passed, provenance complete | Sharing with community |
| **Peer Reviewed** | Another user confirmed observation | Research database |
| **Published** | Verified by researcher, linked to publication | Scientific record |

### 4.3 Citizen Science Submission

**New Engine:** `citizen-science.js`

```javascript
class CitizenScienceEngine {
  // Submit an observation for research
  async submitObservation(observation, metadata): SubmissionResult
  
  // Review observations from other users
  async reviewObservation(observationId, verdict, notes): ReviewResult
  
  // Query the research database
  async queryResearchDatabase(criteria): ResearchResult[]
  
  // Get contribution statistics
  async getContributionStats(userId): ContributionStats
  
  // Link observation to existing research
  async linkToResearch(observationId, researchId): LinkResult
}
```

### 4.4 Research Database Schema

```sql
CREATE TABLE observations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organism_id UUID REFERENCES organisms(id),
  species_id VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  data JSONB NOT NULL,  -- signal data, features, classification
  provenance JSONB NOT NULL,  -- full verification chain
  verification_level VARCHAR(50) DEFAULT 'raw',
  review_count INTEGER DEFAULT 0,
  review_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  observation_id UUID REFERENCES observations(id),
  user_id UUID REFERENCES users(id),
  verdict VARCHAR(50),  -- "confirmed" | "disputed" | "uncertain"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE research_links (
  id UUID PRIMARY KEY,
  observation_id UUID REFERENCES observations(id),
  research_id UUID REFERENCES research(id),
  confidence REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Contribution Gamification

```
ContributionStats {
  userId: UUID
  totalObservations: number
  verifiedObservations: number
  speciesIdentified: string[]
  regionsContributed: string[]
  peerReviews: number
  reputationScore: number
  badges: Badge[]
  level: number
}

Badges:
  - "First Observation" — submitted first observation
  - "Species Pioneer" — first observation of a species in a region
  - "Data Quality" — 90%+ verification rate
  - "Community Helper" — reviewed 100+ observations
  - "Research Contributor" — observation linked to published paper
```

### 4.6 Data Pipeline to Research Institutions

```
User submits observation
  → Provenance chain attached
  → Community review (2+ confirmations)
  → Quality score computed
  → Aggregated into regional/global datasets
  → Made available to researchers via API
  → Linked to publications
  → Cited in research
```

### Deliverables
- [ ] Provenance chain engine
- [ ] Verification levels and scoring
- [ ] Citizen science submission workflow
- [ ] Peer review system
- [ ] Research database (PostgreSQL + PostGIS)
- [ ] Contribution stats and gamification
- [ ] Research institution API access

---

## Phase 5: Intelligence Layer (Weeks 13-18)

**Goal:** Predictive intelligence, AI research assistant, biological search engine.

### 5.1 Predictive Intelligence Engine

**New Engine:** `predictive.js`

```javascript
class PredictiveEngine {
  // Predict next event based on history
  async predictNextEvent(organismId): Prediction
  
  // Forecast resource needs
  async forecastNeeds(organismId): NeedsForecast
  
  // Detect anomalies
  async detectAnomalies(organismId, window): Anomaly[]
  
  // Predict health trajectory
  async predictHealth(organismId, horizon): HealthTrajectory
  
  // Seasonal predictions
  async seasonalForecast(organismId, season): SeasonalForecast
}

Prediction {
  type: string  // "watering_needed", "stress_event", "growth_milestone"
  confidence: number
  estimatedTime: number  // epoch ms
  reasoning: string[]
  evidence: Evidence[]
  recommendedAction: string
}

NeedsForecast {
  watering: { needed: boolean, estimatedHours: number, urgency: string }
  light: { needed: boolean, currentVsOptimal: number }
  temperature: { risk: boolean, expectedChange: string }
  care: { activities: Activity[], overdue: Activity[] }
}

Anomaly {
  type: string  // "unusual_amplitude", "frequency_shift", "behavior_change"
  severity: "low" | "medium" | "high"
  description: string
  baseline: number
  observed: number
  deviation: number
  firstObserved: number
  frequency: number
}
```

**Prediction Algorithms:**
- **Time-series forecasting:** ARIMA-like on spike rate, health score, stress index
- **Pattern matching:** Compare current trajectory to historical patterns
- **Seasonal decomposition:** Separate trend, seasonal, and residual components
- **Anomaly detection:** Z-score on rolling windows, change-point detection

### 5.2 AI Research Assistant

**New Engine:** `research-assistant.js`

```javascript
class ResearchAssistant {
  // Search local history for similar signals
  async searchLocalHistory(signal, options): SearchResult[]
  
  // Search published research
  async searchResearch(query, species): ResearchResult[]
  
  // Answer questions about observations
  async answerQuestion(question, context): Answer
  
  // Generate research hypotheses
  async generateHypotheses(organismId): Hypothesis[]
  
  // Compare with community data
  async compareWithCommunity(organismId, criteria): ComparisonResult
}

SearchResult {
  event: Event
  similarity: number
  organism: OrganismIdentity
  timestamp: number
  context: Context
}

Answer {
  response: string
  confidence: number
  sources: Source[]
  evidence: Evidence[]
  followUpQuestions: string[]
}

Hypothesis {
  statement: string
  confidence: number
  evidence: Evidence[]
  suggestedExperiment: string
  relatedResearch: Research[]
}
```

**RAG Pipeline:**
1. User asks question
2. Extract entities and intent
3. Search local history (IndexedDB)
4. Search species knowledge (SpeciesDB)
5. Search research database (PostgreSQL)
6. Search community observations
7. Synthesize answer with sources
8. Return answer with evidence chain

### 5.3 Biological Search Engine

**New Engine:** `bio-search.js`

```javascript
class BioSearchEngine {
  // Full-text search across all data
  async search(query, filters): SearchResult[]
  
  // Temporal search
  async searchTemporal(criteria): TemporalResult[]
  
  // Comparative search
  async searchComparative(criteria): ComparativeResult[]
  
  // Pattern search
  async searchPattern(pattern): PatternResult[]
  
  // Cross-entity search
  async searchCrossEntity(criteria): CrossEntityResult[]
}

// Example queries:
// "Show every flowering event for tomato plants in greenhouse A"
// "Compare drought responses between species X and Y"
// "Find all organisms that showed stress after temperature drop"
// "Show spike rate trends for all plants in the last month"
```

**Search Index:**
- Full-text index on event classifications, species names, notes
- Temporal index on timestamps
- Spatial index on coordinates
- Feature index on signal characteristics
- Graph index on entity relationships

### Deliverables
- [ ] Predictive intelligence engine
- [ ] AI research assistant with RAG
- [ ] Biological search engine
- [ ] Anomaly detection system
- [ ] Search indexing infrastructure

---

## Phase 6: Platform Scale (Weeks 17-24)

**Goal:** BioEcho Earth, SDK, Marketplace, Emergency Intelligence, Time Machine.

### 6.1 BioEcho Earth

**New File:** `web/js/earth.js`

```javascript
class BioEchoEarth {
  constructor(globeElement) {
    this.globe = null
    this.layers = new Map()
    this.dataSources = new Map()
  }
  
  async initialize()
  async addLayer(layerConfig)
  async loadDataLayer(layerType, dataSource)
  async filterByTime(timeRange)
  async filterBySpecies(speciesId)
  async filterByEvent(eventType)
  async showCommunityMissions()
  async showGlobalPatterns()
  async zoomToLocation(lat, lon, zoom)
}

// Layers:
// - Tree planting locations
// - Bird migration routes
// - Wildlife observations
// - Flowering events (seasonal)
// - Weather patterns
// - Community missions
// - Pollinator activity
// - Research stations
// - Conservation areas
```

### 6.2 Time Machine

**New File:** `web/js/timemachine.js`

```javascript
class TimeMachine {
  constructor(organismId) {
    this.organismId = organismId
    this.timeline = []
    this.currentIndex = 0
  }
  
  async loadTimeline()
  async play(speed)
  async pause()
  async seekTo(timestamp)
  async seekToEvent(eventId)
  async getSnapshotAt(timestamp): Snapshot
  async exportTimeline(): ExportPackage
}

Snapshot {
  timestamp: number
  organism: OrganismIdentity
  state: StateSnapshot
  environment: EnvironmentContext
  events: Event[]
  photos: Photo[]
  activities: Activity[]
  weather: WeatherData
  conversations: Message[]
}
```

### 6.3 BioEcho SDK

**New Directory:** `sdk/`

```javascript
// Plugin architecture
class BioEchoSDK {
  // Register a custom sensor
  static registerSensor(sensorConfig): SensorPlugin
  
  // Register a custom classifier
  static registerClassifier(classifierConfig): ClassifierPlugin
  
  // Register a custom visualization
  static registerVisualization(vizConfig): VisualizationPlugin
  
  // Register a custom data source
  static registerDataSource(sourceConfig): DataSourcePlugin
  
  // Register a custom export format
  static registerExport(exportConfig): ExportPlugin
}

// Plugin interfaces:
SensorPlugin {
  id: string
  name: string
  connect(): Promise<Connection>
  readSample(): Sample
  disconnect(): void
  getCapabilities(): SensorCapabilities
}

ClassifierPlugin {
  id: string
  name: string
  classify(features: Features): Classification
  train(data: TrainingData): Model
  getModelInfo(): ModelInfo
}

VisualizationPlugin {
  id: string
  name: string
  render(data: any, canvas: HTMLCanvasElement): void
  getOptions(): Option[]
}
```

### 6.4 Emergency Intelligence

**New File:** `web/js/emergency.js`

```javascript
class EmergencyEngine {
  // Detect emergency conditions
  async detectEmergency(organismId, signal): Emergency | null
  
  // Get nearest vet/hospital
  async findNearestVet(location): Vet[]
  
  // Get first aid instructions
  async getFirstAid(emergencyType): FirstAidGuide
  
  // Generate emergency report
  async generateReport(organismId, emergency): EmergencyReport
  
  // Share location with emergency services
  async shareLocation(location, contacts): void
  
  // Get medical passport
  async getMedicalPassport(organismId): MedicalPassport
}

Emergency {
  type: string  // "injury", "poisoning", "distress", "disease"
  severity: "low" | "medium" | "high" | "critical"
  organismId: UUID
  timestamp: number
  symptoms: string[]
  recommendedAction: string
  nearbyVets: Vet[]
  firstAid: FirstAidGuide
}

MedicalPassport {
  organismId: UUID
  species: string
  age: number
  weight: number | null
  medicalHistory: MedicalEvent[]
  vaccinations: Vaccination[]
  allergies: string[]
  currentMedications: string[]
  emergencyContacts: Contact[]
}
```

### 6.5 Marketplace

**New File:** `web/js/marketplace.js`

```javascript
class Marketplace {
  // Browse products
  async browse(category, filters): Product[]
  
  // Get recommendations
  async getRecommendations(organismId): Product[]
  
  // Purchase
  async purchase(productId, paymentInfo): OrderResult
  
  // Book vet appointment
  async bookVetAppointment(vetId, time, reason): BookingResult
  
  // Donate to conservation
  async donate(organizationId, amount): DonationResult
  
  // Get seller dashboard
  async getSellerDashboard(sellerId): Dashboard
}

Product {
  id: string
  name: string
  category: "sensor" | "electrode" | "plant_kit" | "pet_supplies" | "course" | "book" | "service"
  description: string
  price: number
  seller: Seller
  rating: number
  reviews: number
  compatibleWith: string[]  // species or sensor types
  organicions: string[]  // recommended with
}
```

### Deliverables
- [ ] BioEcho Earth (globe visualization)
- [ ] Time Machine (organism life replay)
- [ ] BioEcho SDK (plugin architecture)
- [ ] Emergency Intelligence (vet lookup, first aid, medical passport)
- [ ] Marketplace (products, services, donations)

---

## Cross-Cutting Concerns

### Backend Connectivity

**Current Problem:** Web app never calls the API. All data is local.

**Solution:** Sync protocol with offline-first architecture.

```
SyncEngine {
  // Push local changes to backend
  async pushChanges(): SyncResult
  
  // Pull remote changes
  async pullChanges(): SyncResult
  
  // Resolve conflicts
  async resolveConflicts(conflicts: Conflict[]): Resolution[]
  
  // Get sync status
  async getSyncStatus(): SyncStatus
}

SyncProtocol:
  1. Local changes queued in IndexedDB
  2. On network available: push to backend
  3. Backend merges with conflict resolution
  4. Pull remote changes
  5. Apply to local store
  6. Notify UI of updates
```

### Security & Identity

```
IdentityService {
  // User authentication
  async login(email, password): AuthToken
  async register(email, name, password): User
  
  // Organism identity verification
  async verifyOrganismIdentity(organismId, proof): boolean
  
  // Data encryption
  async encryptData(data, key): EncryptedData
  async decryptData(encrypted, key): Data
  
  // Access control
  async checkPermission(userId, resource, action): boolean
}
```

### Performance Optimization

| Area | Strategy |
|------|----------|
| **IndexedDB** | Compound indexes, cursor-based pagination, WAL mode |
| **Graph queries** | Adjacency list caching, breadth-first with early termination |
| **Signal processing** | WASM for DSP, Web Workers for heavy computation |
| **Rendering** | Canvas offscreen rendering, requestAnimationFrame throttling |
| **Sync** | Delta sync, compression, batch operations |

---

## Execution Timeline

```
Week 1-4:   Phase 1 — Living Identity Layer + Data Foundation
Week 5-10:  Phase 2 — Universal Knowledge Graph
Week 7-12:  Phase 3 — BioEcho Lens + Camera-First UX (parallel with Phase 2)
Week 11-16: Phase 4 — Citizen Science + Verification Engine
Week 13-18: Phase 5 — Intelligence Layer (parallel with Phase 4)
Week 17-24: Phase 6 — Platform Scale

Critical Path: Phase 1 → Phase 2 → Phase 3 → Phase 6
Parallel Tracks: Phase 4 + Phase 5 (can run concurrently)
```

## Resource Requirements

| Phase | Frontend | Backend | ML/AI | Hardware |
|-------|----------|---------|-------|----------|
| Phase 1 | 1 dev | 0.5 dev | 0 | 0 |
| Phase 2 | 1 dev | 1 dev | 0 | 0 |
| Phase 3 | 2 dev | 0.5 dev | 1 dev | Camera test devices |
| Phase 4 | 1 dev | 1.5 dev | 0.5 dev | 0 |
| Phase 5 | 1 dev | 1 dev | 2 dev | 0 |
| Phase 6 | 3 dev | 2 dev | 1 dev | Sensor hardware |

**Minimum viable team:** 2 full-stack developers + 1 ML engineer

---

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------|---------|---------|---------|---------|---------|
| Organisms tracked | 10 | 100 | 1,000 | 10,000 | 100,000 | 1,000,000 |
| Events recorded | 1,000 | 10,000 | 100,000 | 1,000,000 | 10,000,000 | 100,000,000 |
| Users | 1 | 10 | 100 | 1,000 | 10,000 | 100,000 |
| Species in DB | 5 | 50 | 500 | 5,000 | 50,000 | 500,000 |
| Research papers | 0 | 10 | 100 | 1,000 | 10,000 | 100,000 |
| Verified observations | 0 | 0 | 100 | 10,000 | 100,000 | 1,000,000 |
| SDK plugins | 0 | 0 | 0 | 5 | 50 | 500 |
