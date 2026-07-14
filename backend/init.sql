-- BioEcho OS PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organisms (plants, animals)
CREATE TABLE IF NOT EXISTS organisms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    species VARCHAR(255),
    type VARCHAR(50) CHECK (type IN ('plant', 'animal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    twin JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Events (spikes, classifications, stimuli)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organism_id UUID REFERENCES organisms(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    classification VARCHAR(100),
    confidence REAL,
    feature_vector JSONB DEFAULT '{}'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,
    recording_url TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organism-to-user mapping
CREATE TABLE IF NOT EXISTS organism_users (
    organism_id UUID REFERENCES organisms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'owner',
    PRIMARY KEY (organism_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_organism_time ON events(organism_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_classification ON events(classification);
CREATE INDEX IF NOT EXISTS idx_organisms_type ON organisms(type);

-- Audit trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organisms_updated_at
    BEFORE UPDATE ON organisms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data
INSERT INTO organisms (name, species, type, twin) VALUES
    ('Plant #42', 'Epipremnum aureum', 'plant',
     '{"healthScore": 0.95, "stressIndex": 0.05, "spikeRate": 0, "noiseFloor": 2.0}'::jsonb),
    ('Plant #43', 'Chlorophytum comosum', 'plant',
     '{"healthScore": 0.92, "stressIndex": 0.08, "spikeRate": 0, "noiseFloor": 2.5}'::jsonb)
ON CONFLICT DO NOTHING;
