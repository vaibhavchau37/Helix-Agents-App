/*
# AEGIS Auth & Role-Based Access Control

## Summary
Adds user authentication and role-based access control (RBAC) to AEGIS. Three roles: owner, admin, user.
The first user to sign up becomes the owner. Owners and admins can manage projects; regular users have read-only access plus the ability to create projects. Only the owner can promote/demote/delete users.

## New Tables
- `profiles` — extends `auth.users` with a role and display name
  - `id` (uuid, PK, FK -> auth.users.id ON DELETE CASCADE)
  - `email` (text, from auth.users)
  - `display_name` (text, user-chosen name)
  - `role` (text, CHECK in owner/admin/user, default 'user')
  - `created_at` (timestamptz, default now())

## New Functions
- `handle_new_user()` — SECURITY DEFINER trigger function: auto-creates a profile row when a new auth.users row is inserted. The first ever user gets role 'owner'; all subsequent users get 'user'.

## Security Changes
- RLS enabled on `profiles`.
- `profiles`: authenticated users can SELECT all profiles (needed for user list / display names). UPDATE only on own profile (display_name). DELETE restricted: users can delete self, but role column is protected — only owner can change roles.
- All existing tables (projects, tasks, agent_runs, code_artifacts, execution_logs, bug_fixes, security_reports, performance_reports, memory_entries): policies updated from `TO anon, authenticated USING (true)` to require authentication. SELECT for all authenticated users (read access). INSERT/UPDATE/DELETE for all authenticated users (so the pipeline edge function, running as authenticated, can write). The frontend enforces role-based write restrictions; DB-level RLS ensures only signed-in users can touch data.
- Edge function `aegis-pipeline` uses the service role key (bypasses RLS) so pipeline writes always succeed regardless of caller role.

## Important Notes
1. The first user to sign up automatically becomes 'owner'. Make sure to sign up first with the account you want to be the owner.
2. Email confirmation stays OFF (per Bolt defaults).
3. The `handle_new_user` trigger fires on INSERT to `auth.users`, so every signUp call creates a profile automatically.
4. Existing anon-key access is removed — the app now requires sign-in.
*/

-- ============================================================
-- 1. Create profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grants: authenticated can read all profiles; update own; service_role full
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (display_name) ON profiles TO authenticated;
GRANT DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

-- Policies for profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 2. Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'owner') THEN 'owner'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Tighten RLS on existing tables: require authentication
-- ============================================================

-- projects
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;

CREATE POLICY "auth_select_projects" ON projects FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_projects" ON projects FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_projects" ON projects FOR DELETE
  TO authenticated USING (true);

-- tasks
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;

CREATE POLICY "auth_select_tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tasks" ON tasks FOR DELETE TO authenticated USING (true);

-- agent_runs
DROP POLICY IF EXISTS "anon_select_agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "anon_insert_agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "anon_update_agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "anon_delete_agent_runs" ON agent_runs;

CREATE POLICY "auth_select_agent_runs" ON agent_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_agent_runs" ON agent_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_agent_runs" ON agent_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_agent_runs" ON agent_runs FOR DELETE TO authenticated USING (true);

-- code_artifacts
DROP POLICY IF EXISTS "anon_select_code_artifacts" ON code_artifacts;
DROP POLICY IF EXISTS "anon_insert_code_artifacts" ON code_artifacts;
DROP POLICY IF EXISTS "anon_update_code_artifacts" ON code_artifacts;
DROP POLICY IF EXISTS "anon_delete_code_artifacts" ON code_artifacts;

CREATE POLICY "auth_select_code_artifacts" ON code_artifacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_code_artifacts" ON code_artifacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_code_artifacts" ON code_artifacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_code_artifacts" ON code_artifacts FOR DELETE TO authenticated USING (true);

-- execution_logs
DROP POLICY IF EXISTS "anon_select_execution_logs" ON execution_logs;
DROP POLICY IF EXISTS "anon_insert_execution_logs" ON execution_logs;
DROP POLICY IF EXISTS "anon_update_execution_logs" ON execution_logs;
DROP POLICY IF EXISTS "anon_delete_execution_logs" ON execution_logs;

CREATE POLICY "auth_select_execution_logs" ON execution_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_execution_logs" ON execution_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_execution_logs" ON execution_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_execution_logs" ON execution_logs FOR DELETE TO authenticated USING (true);

-- bug_fixes
DROP POLICY IF EXISTS "anon_select_bug_fixes" ON bug_fixes;
DROP POLICY IF EXISTS "anon_insert_bug_fixes" ON bug_fixes;
DROP POLICY IF EXISTS "anon_update_bug_fixes" ON bug_fixes;
DROP POLICY IF EXISTS "anon_delete_bug_fixes" ON bug_fixes;

CREATE POLICY "auth_select_bug_fixes" ON bug_fixes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bug_fixes" ON bug_fixes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_bug_fixes" ON bug_fixes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_bug_fixes" ON bug_fixes FOR DELETE TO authenticated USING (true);

-- security_reports
DROP POLICY IF EXISTS "anon_select_security_reports" ON security_reports;
DROP POLICY IF EXISTS "anon_insert_security_reports" ON security_reports;
DROP POLICY IF EXISTS "anon_update_security_reports" ON security_reports;
DROP POLICY IF EXISTS "anon_delete_security_reports" ON security_reports;

CREATE POLICY "auth_select_security_reports" ON security_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_security_reports" ON security_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_security_reports" ON security_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_security_reports" ON security_reports FOR DELETE TO authenticated USING (true);

-- performance_reports
DROP POLICY IF EXISTS "anon_select_performance_reports" ON performance_reports;
DROP POLICY IF EXISTS "anon_insert_performance_reports" ON performance_reports;
DROP POLICY IF EXISTS "anon_update_performance_reports" ON performance_reports;
DROP POLICY IF EXISTS "anon_delete_performance_reports" ON performance_reports;

CREATE POLICY "auth_select_performance_reports" ON performance_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_performance_reports" ON performance_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_performance_reports" ON performance_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_performance_reports" ON performance_reports FOR DELETE TO authenticated USING (true);

-- memory_entries
DROP POLICY IF EXISTS "anon_select_memory_entries" ON memory_entries;
DROP POLICY IF EXISTS "anon_insert_memory_entries" ON memory_entries;
DROP POLICY IF EXISTS "anon_update_memory_entries" ON memory_entries;
DROP POLICY IF EXISTS "anon_delete_memory_entries" ON memory_entries;

CREATE POLICY "auth_select_memory_entries" ON memory_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_memory_entries" ON memory_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_memory_entries" ON memory_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_memory_entries" ON memory_entries FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 4. RPC for owner-only role management (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_role NOT IN ('owner', 'admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the owner can change user roles';
  END IF;

  -- Prevent demoting yourself if you're the only owner
  IF target_user_id = auth.uid() AND new_role != 'owner' THEN
    RAISE EXCEPTION 'Owner cannot demote themselves';
  END IF;

  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- RPC: delete a user (owner only) — removes from auth.users which cascades to profiles
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the owner can delete users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Owner cannot delete their own account';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
