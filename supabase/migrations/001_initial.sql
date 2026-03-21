-- ============================================================
-- Audit Workpaper System - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'reviewer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- AUDIT PROJECTS TABLE
-- ============================================================
CREATE TABLE audit_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  fiscal_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit_projects
ALTER TABLE audit_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects" ON audit_projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert projects" ON audit_projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update projects" ON audit_projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete projects" ON audit_projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- WORKPAPERS TABLE
-- ============================================================
CREATE TABLE workpapers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES audit_projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  workpaper_number TEXT NOT NULL,
  category TEXT,
  content JSONB,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_review', 'completed')),
  assigned_creator UUID REFERENCES profiles(id),
  assigned_reviewer UUID REFERENCES profiles(id),
  creator_checked_at TIMESTAMPTZ,
  creator_checked_by UUID REFERENCES profiles(id),
  reviewer_checked_at TIMESTAMPTZ,
  reviewer_checked_by UUID REFERENCES profiles(id),
  creator_comment TEXT,
  reviewer_comment TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for workpapers
ALTER TABLE workpapers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workpapers" ON workpapers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Creators and admins can insert workpapers" ON workpapers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('creator', 'admin')
    )
  );

CREATE POLICY "Assigned users and admins can update workpapers" ON workpapers
  FOR UPDATE USING (
    auth.uid() = assigned_creator
    OR auth.uid() = assigned_reviewer
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete workpapers" ON workpapers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- WORKPAPER FILES TABLE
-- ============================================================
CREATE TABLE workpaper_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for workpaper_files
ALTER TABLE workpaper_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view files" ON workpaper_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert files" ON workpaper_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "File owners and admins can delete files" ON workpaper_files
  FOR DELETE USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_projects_updated_at
  BEFORE UPDATE ON audit_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workpapers_updated_at
  BEFORE UPDATE ON workpapers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'creator')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Create storage bucket for workpaper attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workpaper-attachments',
  'workpaper-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workpaper-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workpaper-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "File owners and admins can delete files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'workpaper-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_workpapers_project_id ON workpapers(project_id);
CREATE INDEX idx_workpapers_status ON workpapers(status);
CREATE INDEX idx_workpapers_assigned_creator ON workpapers(assigned_creator);
CREATE INDEX idx_workpapers_assigned_reviewer ON workpapers(assigned_reviewer);
CREATE INDEX idx_workpaper_files_workpaper_id ON workpaper_files(workpaper_id);
CREATE INDEX idx_profiles_role ON profiles(role);
