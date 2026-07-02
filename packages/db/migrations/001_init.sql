-- Ellipse — schéma initial PostgreSQL (ellisphere @ localhost:5435)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_sessions (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planning', 'executing', 'completed', 'failed')),
  plan JSONB,
  gdl JSONB,
  master_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON generation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON generation_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS task_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  agent TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_results_session ON task_results(session_id);

CREATE TABLE IF NOT EXISTS uploaded_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES generation_sessions(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('001_init')
ON CONFLICT (version) DO NOTHING;
