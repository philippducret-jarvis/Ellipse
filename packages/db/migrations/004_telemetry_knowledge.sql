-- T3 — Télémetrie persistée + chunks connaissance workspace (RAG minimal)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES game_projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_project ON telemetry_events(project_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS project_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, source_path)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_project ON project_knowledge_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON project_knowledge_chunks USING GIN(tags);
