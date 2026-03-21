-- ============================================================
-- 招待システム: 管理者のみがユーザーを招待できる仕組み
-- 招待なしの新規登録を不可にするため、
-- ログインページのサインアップ機能も廃止する
-- ============================================================

-- ----------------------------------------------------------------
-- 1. invitations テーブル
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('creator', 'reviewer', 'admin')),
  token      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID        NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- ----------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 管理者: 全操作可
CREATE POLICY "admins can manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- サービスロール: 全操作可 (APIルートから使用)
CREATE POLICY "service role full access on invitations" ON public.invitations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 招待されたユーザー本人: 自分宛の招待を参照可 (受け入れ時に使用)
CREATE POLICY "users can view own invitation" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
