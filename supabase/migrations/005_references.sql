-- ============================================================
-- Workpaper References (調書間参照関係)
-- ============================================================

CREATE TABLE workpaper_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE NOT NULL,
  to_workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workpaper_references_no_self_ref CHECK (from_workpaper_id <> to_workpaper_id),
  UNIQUE (from_workpaper_id, to_workpaper_id)
);

-- RLS for workpaper_references
ALTER TABLE workpaper_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view references" ON workpaper_references
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert references" ON workpaper_references
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Creator or admin can delete references" ON workpaper_references
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast lookup in both directions
CREATE INDEX idx_workpaper_references_from ON workpaper_references (from_workpaper_id);
CREATE INDEX idx_workpaper_references_to ON workpaper_references (to_workpaper_id);
