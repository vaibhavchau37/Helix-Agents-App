export type ProjectStatus =
  | 'drafting'
  | 'analyzing'
  | 'generating'
  | 'executing'
  | 'healing'
  | 'completed'
  | 'failed';

export type AgentName = 'supervisor' | 'coder' | 'tester' | 'security' | 'performance';

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type TaskType = 'architecture' | 'code' | 'test' | 'security' | 'performance';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ArtifactType = 'code' | 'config' | 'docs' | 'test';
export type LogLevel = 'info' | 'warning' | 'error' | 'success';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type PerfCategory = 'cpu' | 'memory' | 'latency' | 'throughput';

import type { LucideIcon } from 'lucide-react';

export type IconType = LucideIcon;

export type MemoryType = 'bug' | 'solution' | 'pattern' | 'learning';

export interface Project {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  agent: AgentName;
  order_index: number;
  created_at: string;
}

export interface AgentRun {
  id: string;
  project_id: string;
  agent: AgentName;
  action: string;
  status: RunStatus;
  input: string;
  output: string;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface CodeArtifact {
  id: string;
  project_id: string;
  filename: string;
  language: string;
  content: string;
  artifact_type: ArtifactType;
  created_at: string;
}

export interface ExecutionLog {
  id: string;
  project_id: string;
  agent_run_id: string | null;
  level: LogLevel;
  message: string;
  exit_code: number | null;
  created_at: string;
}

export interface BugFix {
  id: string;
  project_id: string;
  error_message: string;
  diagnosis: string;
  fix_applied: string;
  retry_status: 'pending' | 'fixed' | 'failed';
  attempt_number: number;
  created_at: string;
}

export interface SecurityReport {
  id: string;
  project_id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'mitigated' | 'ignored';
  created_at: string;
}

export interface PerformanceReport {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  category: PerfCategory;
  recommendation: string;
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  project_id: string | null;
  entry_type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  similarity_score: number | null;
  created_at: string;
}

export const AGENTS: { name: AgentName; label: string; icon: string; color: string; description: string }[] = [
  {
    name: 'supervisor',
    label: 'Supervisor',
    icon: 'Cpu',
    color: 'sky',
    description: 'Coordinates all agents, routes tasks, tracks overall progress.',
  },
  {
    name: 'coder',
    label: 'Coder',
    icon: 'Code2',
    color: 'emerald',
    description: 'Generates project structure, source files, and documentation.',
  },
  {
    name: 'tester',
    label: 'Tester',
    icon: 'TestTube2',
    color: 'amber',
    description: 'Executes generated code, runs test suites, captures failures.',
  },
  {
    name: 'security',
    label: 'Security',
    icon: 'ShieldCheck',
    color: 'rose',
    description: 'Scans dependencies and source for vulnerabilities.',
  },
  {
    name: 'performance',
    label: 'Performance',
    icon: 'Gauge',
    color: 'violet',
    description: 'Monitors CPU/memory usage, recommends optimizations.',
  },
];
