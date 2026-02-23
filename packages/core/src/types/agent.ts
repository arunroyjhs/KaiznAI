export type AgentRuntime = 'claude-code' | 'cursor' | 'windsurf' | 'devin' | 'custom-rest';

export type AgentStatus = 'idle' | 'building' | 'testing' | 'reporting' | 'error' | 'disconnected';

export interface AgentRegistration {
  id: string;
  runtime: AgentRuntime;
  name: string;
  version?: string;
  capabilities: string[];
  connectedAt: Date;
  lastHeartbeat: Date;
  status: AgentStatus;
  currentExperimentId?: string;
  orgId: string;
  workspaceId: string;
}

export interface AgentAction {
  id: string;
  agentId: string;
  experimentId: string;
  action: string;
  details: Record<string, unknown>;
  filesAffected?: string[];
  timestamp: Date;
  orgId: string;
}

export interface AgentHeartbeat {
  agentId: string;
  status: AgentStatus;
  currentExperimentId?: string;
  progress?: number;
  message?: string;
}
