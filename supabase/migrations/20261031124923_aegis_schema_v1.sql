/*
# AEGIS Platform Schema

## Overview
Creates the full data model for AEGIS — an autonomous multi-agent AI software engineering platform.
This is a single-tenant app (no sign-in screen), so all policies target anon + authenticated.

## Tables

1. `projects` — software projects that AEGIS builds from natural-language requirements
   - id, title, description, requirements (natural language input), status, created_at, updated_at
   - status: drafting | analyzing | generating | executing | healing | completed | failed

2. `tasks` — structured tasks generated from a project's requirements (Requirement Understanding Engine)
   - id, project_id (FK), title, description, type (architecture|code|test|security|performance), status, agent, order_index, created_at

3. `agent_runs` — individual agent execution records (Supervisor, Coder, Tester, Security, Performance)
   - id, project_id (FK), agent (supervisor|coder|tester|security|performance), action, status (queued|running|completed|failed), input, output, duration_ms, created_at, completed_at

4. `code_artifacts` — generated code files and documentation
   - id, project_id (FK), filename, language, content, artifact_type (code|config|docs|test), created_at

5. `execution_logs` — sandbox execution output (stdout/stderr/exit codes)
   - id, project_id (FK), agent_run_id (FK nullable), level (info|warning|error|success), message, exit_code, created_at

6. `bug_fixes` — self-healing engine records: detected failure → generated fix → retry result
   - id, project_id (FK), error_message, diagnosis, fix_applied, retry_status (pending|fixed|failed), attempt_number, created_at

7. `security_reports` — security agent findings (vulnerabilities, recommendations)
   - id, project_id (FK), severity (critical|high|medium|low|info), category, title, description, recommendation, status, created_at

8. `performance_reports` — performance agent findings (CPU/memory metrics, optimizations)
   - id, project_id (FK), metric_name, metric_value, unit, category (cpu|memory|latency|throughput), recommendation, created_at

9. `memory_entries` — long-term memory / knowledge base (ChromaDB equivalent) of bugs + solutions
   - id, project_id (FK nullable), entry_type (bug|solution|pattern|learning), title, content, tags, similarity_score, created_at

## Security
- RLS enabled on every table.
- All tables grant CRUD to anon + authenticated (single-tenant, intentionally shared data).
- USING (true) / WITH CHECK (true) is acceptable because the data is intentionally public/shared.
*/

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'drafting'
    CHECK (status IN ('drafting','analyzing','generating','executing','healing','completed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'architecture'
    CHECK (type IN ('architecture','code','test','security','performance')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','failed')),
  agent text NOT NULL DEFAULT 'supervisor'
    CHECK (agent IN ('supervisor','coder','tester','security','performance')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon, authenticated USING (true);

-- agent_runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent text NOT NULL
    CHECK (agent IN ('supervisor','coder','tester','security','performance')),
  action text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed')),
  input text NOT NULL DEFAULT '',
  output text NOT NULL DEFAULT '',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_runs TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
DROP POLICY IF EXISTS "anon_select_agent_runs" ON agent_runs;
CREATE POLICY "anon_select_agent_runs" ON agent_runs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_runs" ON agent_runs;
CREATE POLICY "anon_insert_agent_runs" ON agent_runs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_agent_runs" ON agent_runs;
CREATE POLICY "anon_update_agent_runs" ON agent_runs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_runs" ON agent_runs;
CREATE POLICY "anon_delete_agent_runs" ON agent_runs FOR DELETE TO anon, authenticated USING (true);

-- code_artifacts
CREATE TABLE IF NOT EXISTS code_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  language text NOT NULL DEFAULT 'text',
  content text NOT NULL DEFAULT '',
  artifact_type text NOT NULL DEFAULT 'code'
    CHECK (artifact_type IN ('code','config','docs','test')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE code_artifacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON code_artifacts TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_code_artifacts_project_id ON code_artifacts(project_id);
DROP POLICY IF EXISTS "anon_select_code_artifacts" ON code_artifacts;
CREATE POLICY "anon_select_code_artifacts" ON code_artifacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_code_artifacts" ON code_artifacts;
CREATE POLICY "anon_insert_code_artifacts" ON code_artifacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_code_artifacts" ON code_artifacts;
CREATE POLICY "anon_update_code_artifacts" ON code_artifacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_code_artifacts" ON code_artifacts;
CREATE POLICY "anon_delete_code_artifacts" ON code_artifacts FOR DELETE TO anon, authenticated USING (true);

-- execution_logs
CREATE TABLE IF NOT EXISTS execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info'
    CHECK (level IN ('info','warning','error','success')),
  message text NOT NULL DEFAULT '',
  exit_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON execution_logs TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_execution_logs_project_id ON execution_logs(project_id);
DROP POLICY IF EXISTS "anon_select_execution_logs" ON execution_logs;
CREATE POLICY "anon_select_execution_logs" ON execution_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_execution_logs" ON execution_logs;
CREATE POLICY "anon_insert_execution_logs" ON execution_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_execution_logs" ON execution_logs;
CREATE POLICY "anon_update_execution_logs" ON execution_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_execution_logs" ON execution_logs;
CREATE POLICY "anon_delete_execution_logs" ON execution_logs FOR DELETE TO anon, authenticated USING (true);

-- bug_fixes
CREATE TABLE IF NOT EXISTS bug_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  error_message text NOT NULL DEFAULT '',
  diagnosis text NOT NULL DEFAULT '',
  fix_applied text NOT NULL DEFAULT '',
  retry_status text NOT NULL DEFAULT 'pending'
    CHECK (retry_status IN ('pending','fixed','failed')),
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bug_fixes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bug_fixes TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_bug_fixes_project_id ON bug_fixes(project_id);
DROP POLICY IF EXISTS "anon_select_bug_fixes" ON bug_fixes;
CREATE POLICY "anon_select_bug_fixes" ON bug_fixes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bug_fixes" ON bug_fixes;
CREATE POLICY "anon_insert_bug_fixes" ON bug_fixes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bug_fixes" ON bug_fixes;
CREATE POLICY "anon_update_bug_fixes" ON bug_fixes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bug_fixes" ON bug_fixes;
CREATE POLICY "anon_delete_bug_fixes" ON bug_fixes FOR DELETE TO anon, authenticated USING (true);

-- security_reports
CREATE TABLE IF NOT EXISTS security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('critical','high','medium','low','info')),
  category text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  recommendation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','mitigated','ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_reports TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_security_reports_project_id ON security_reports(project_id);
DROP POLICY IF EXISTS "anon_select_security_reports" ON security_reports;
CREATE POLICY "anon_select_security_reports" ON security_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_security_reports" ON security_reports;
CREATE POLICY "anon_insert_security_reports" ON security_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_security_reports" ON security_reports;
CREATE POLICY "anon_update_security_reports" ON security_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_security_reports" ON security_reports;
CREATE POLICY "anon_delete_security_reports" ON security_reports FOR DELETE TO anon, authenticated USING (true);

-- performance_reports
CREATE TABLE IF NOT EXISTS performance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'cpu'
    CHECK (category IN ('cpu','memory','latency','throughput')),
  recommendation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_reports TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_performance_reports_project_id ON performance_reports(project_id);
DROP POLICY IF EXISTS "anon_select_performance_reports" ON performance_reports;
CREATE POLICY "anon_select_performance_reports" ON performance_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_performance_reports" ON performance_reports;
CREATE POLICY "anon_insert_performance_reports" ON performance_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_performance_reports" ON performance_reports;
CREATE POLICY "anon_update_performance_reports" ON performance_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_performance_reports" ON performance_reports;
CREATE POLICY "anon_delete_performance_reports" ON performance_reports FOR DELETE TO anon, authenticated USING (true);

-- memory_entries
CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  entry_type text NOT NULL DEFAULT 'learning'
    CHECK (entry_type IN ('bug','solution','pattern','learning')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  similarity_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_entries TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_memory_entries_project_id ON memory_entries(project_id);
DROP POLICY IF EXISTS "anon_select_memory_entries" ON memory_entries;
CREATE POLICY "anon_select_memory_entries" ON memory_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_memory_entries" ON memory_entries;
CREATE POLICY "anon_insert_memory_entries" ON memory_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_memory_entries" ON memory_entries;
CREATE POLICY "anon_update_memory_entries" ON memory_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_memory_entries" ON memory_entries;
CREATE POLICY "anon_delete_memory_entries" ON memory_entries FOR DELETE TO anon, authenticated USING (true);

-- updated_at trigger for projects
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();