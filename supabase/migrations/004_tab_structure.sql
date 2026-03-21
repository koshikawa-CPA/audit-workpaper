-- ============================================================
-- Tab Structure for 3-Layer OneNote-style Workpaper Navigation
-- ============================================================

-- Tab configuration per project
CREATE TABLE IF NOT EXISTS workpaper_tab_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES audit_projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workpaper_tab_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tab configs" ON workpaper_tab_configs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Creators and admins can insert tab configs" ON workpaper_tab_configs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('creator', 'admin'))
  );

CREATE POLICY "Creators and admins can update tab configs" ON workpaper_tab_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('creator', 'admin'))
  );

-- Auto-update timestamp
CREATE TRIGGER update_workpaper_tab_configs_updated_at
  BEFORE UPDATE ON workpaper_tab_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add tab identifiers to workpapers table
ALTER TABLE workpapers
  ADD COLUMN IF NOT EXISTS tab_layer1_id TEXT,
  ADD COLUMN IF NOT EXISTS tab_layer2_id TEXT,
  ADD COLUMN IF NOT EXISTS tab_layer3_id TEXT;

-- Index for fast tab-based lookups
CREATE INDEX IF NOT EXISTS idx_workpapers_tab_combo
  ON workpapers(project_id, tab_layer1_id, tab_layer2_id, tab_layer3_id);
