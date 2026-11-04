import { supabase } from './supabase';
import type { Project } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export async function createProject(title: string, description: string, requirements: string): Promise<string> {
  const { data, error } = await supabase.from('projects').insert({
    title: title || requirements.trim().split(/[.\n]/)[0].slice(0, 70) || 'Untitled Project',
    description,
    requirements,
    status: 'drafting',
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteProject(projectId: string) {
  await supabase.from('projects').delete().eq('id', projectId);
}

export async function runProjectPipeline(projectId: string, onProgress: (msg: string) => void): Promise<void> {
  const apiUrl = `${supabaseUrl}/functions/v1/aegis-pipeline`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // The anon key is needed for the function call
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }

  onProgress('[Supervisor] Launching Helix Agents backend pipeline...');

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId }),
    });
  } catch (err) {
    onProgress(`[Supervisor] Failed to reach backend: ${err instanceof Error ? err.message : 'network error'}`);
    throw err;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown error');
    onProgress(`[Supervisor] Backend returned ${response.status}: ${errText}`);
    throw new Error(`Pipeline start failed (${response.status})`);
  }

  onProgress('[Supervisor] Pipeline accepted by backend. Agents are working...');

  // Poll the database for real-time status until the project completes
  await pollUntilComplete(projectId, onProgress);
}

async function pollUntilComplete(projectId: string, onProgress: (msg: string) => void) {
  const seenLogIds = new Set<string>();
  let lastStatus = '';
  let polls = 0;
  const maxPolls = 120; // 120 polls * 1.5s = 3 minutes max

  const poll = async (): Promise<boolean> => {
    polls++;
    if (polls > maxPolls) {
      onProgress('[Supervisor] Polling timed out. Check the project status manually.');
      return true;
    }

    // Fetch latest logs
    const { data: newLogs } = await supabase
      .from('execution_logs')
      .select('id, level, message, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (newLogs) {
      for (const log of newLogs) {
        if (!seenLogIds.has(log.id)) {
          seenLogIds.add(log.id);
          onProgress(`[${log.level.toUpperCase()}] ${log.message}`);
        }
      }
    }

    // Check project status
    const { data: project } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

    if (project) {
      if (project.status !== lastStatus) {
        lastStatus = project.status;
        onProgress(`[Supervisor] Project status changed to: ${project.status.toUpperCase()}`);
      }
      if (project.status === 'completed' || project.status === 'failed') {
        onProgress(`[Supervisor] Pipeline finished with status: ${project.status.toUpperCase()}`);
        return true;
      }
    }

    return false;
  };

  // Initial poll
  let done = await poll();
  while (!done) {
    await new Promise((r) => setTimeout(r, 1500));
    done = await poll();
  }
}

export async function deleteProjectArtifacts(projectId: string) {
  await supabase.from('code_artifacts').delete().eq('project_id', projectId);
  await supabase.from('execution_logs').delete().eq('project_id', projectId);
  await supabase.from('agent_runs').delete().eq('project_id', projectId);
  await supabase.from('tasks').delete().eq('project_id', projectId);
  await supabase.from('bug_fixes').delete().eq('project_id', projectId);
  await supabase.from('security_reports').delete().eq('project_id', projectId);
  await supabase.from('performance_reports').delete().eq('project_id', projectId);
  await supabase.from('memory_entries').delete().eq('project_id', projectId);
}
