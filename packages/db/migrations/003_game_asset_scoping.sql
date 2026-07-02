ALTER TABLE uploaded_assets
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES game_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS game_asset_id UUID REFERENCES game_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_project ON uploaded_assets(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_assets_asset ON uploaded_assets(game_asset_id, created_at DESC);

ALTER TABLE game_assets
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'environment';

UPDATE game_assets
SET role = CASE
  WHEN kind = 'ui' THEN 'ui'
  WHEN kind = 'environment' THEN 'environment'
  WHEN kind = 'fx' THEN 'fx'
  WHEN kind = 'prop' THEN 'prop'
  ELSE 'hero'
END
WHERE role IS NULL OR role = '';

INSERT INTO schema_migrations (version)
VALUES ('003_game_asset_scoping')
ON CONFLICT (version) DO NOTHING;
