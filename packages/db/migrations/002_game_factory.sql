CREATE TABLE IF NOT EXISTS game_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'planning', 'producing', 'review', 'ready', 'archived')),
  source_prompt TEXT NOT NULL,
  summary TEXT,
  genre TEXT,
  dimension TEXT NOT NULL CHECK (dimension IN ('2d', '3d')),
  target_runtime TEXT NOT NULL CHECK (target_runtime IN ('ellipse_web_2d', 'ellipse_photo_3d')),
  camera_mode TEXT NOT NULL CHECK (camera_mode IN ('side_view', 'top_down', 'third_person', 'isometric')),
  source_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_projects_status ON game_projects(status);
CREATE INDEX IF NOT EXISTS idx_game_projects_created ON game_projects(created_at DESC);

CREATE TABLE IF NOT EXISTS game_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  source_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  intent JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_prompts_project ON game_prompts(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'pitch',
    'game_design_document',
    'narrative_bible',
    'art_direction',
    'technical_design',
    'production_plan',
    'iteration_brief'
  )),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'generated', 'approved')),
  content TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'ellipse_cortex',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_documents_project ON game_documents(project_id, kind);

CREATE TABLE IF NOT EXISTS game_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lane TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES game_tasks(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL REFERENCES game_agents(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('vision', 'document', 'asset', 'scene', 'code', 'qa', 'build')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'ready', 'in_progress', 'blocked', 'review', 'done')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 0 AND 10),
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_tasks_project ON game_tasks(project_id, status, priority DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS game_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES game_tasks(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL REFERENCES game_agents(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'partial', 'failed')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_agent_runs_project ON game_agent_runs(project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS game_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('character', 'environment', 'ui', 'audio', 'model', 'fx', 'prop')),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('source_ready', 'concept', 'in_progress', 'review', 'approved')),
  source_prompt TEXT,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_assets_project ON game_assets(project_id, kind, created_at ASC);

CREATE TABLE IF NOT EXISTS game_asset_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES game_assets(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_asset_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES game_assets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'concept',
  score NUMERIC(5,2),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_asset_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES game_asset_variants(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  scene_type TEXT NOT NULL CHECK (scene_type IN ('level', 'hub', 'menu', 'cutscene')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'blocked', 'ready')),
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, slug)
);

CREATE TABLE IF NOT EXISTS game_code_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  language TEXT NOT NULL,
  purpose TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, path)
);

CREATE TABLE IF NOT EXISTS game_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'building', 'ready', 'failed')),
  output_url TEXT,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_builds_project ON game_builds(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  build_id UUID REFERENCES game_builds(id) ON DELETE SET NULL,
  suite TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'passed', 'failed')),
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  summary TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('002_game_factory')
ON CONFLICT (version) DO NOTHING;
