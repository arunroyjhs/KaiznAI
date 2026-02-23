import type { AgentRegistration, AgentAction, AgentHeartbeat, AgentRuntime } from '@outcome-runtime/core';

export interface AgentRegistryStore {
  register(agent: Omit<AgentRegistration, 'id' | 'connectedAt' | 'lastHeartbeat'>): Promise<AgentRegistration>;
  unregister(agentId: string): Promise<void>;
  updateHeartbeat(heartbeat: AgentHeartbeat): Promise<void>;
  getAgent(agentId: string): Promise<AgentRegistration | null>;
  getActiveAgents(orgId: string): Promise<AgentRegistration[]>;
  getAgentForExperiment(experimentId: string): Promise<AgentRegistration | null>;
  logAction(action: Omit<AgentAction, 'id' | 'timestamp'>): Promise<AgentAction>;
  getActionsForExperiment(experimentId: string): Promise<AgentAction[]>;
}

export class AgentRegistry {
  private readonly HEARTBEAT_TIMEOUT_MS = 60_000; // 1 minute

  constructor(private store: AgentRegistryStore) {}

  async register(
    runtime: AgentRuntime,
    name: string,
    orgId: string,
    workspaceId: string,
    capabilities: string[] = [],
    version?: string,
  ): Promise<AgentRegistration> {
    return this.store.register({ runtime, name, orgId, workspaceId, capabilities, version, status: 'idle' });
  }

  async unregister(agentId: string): Promise<void> {
    return this.store.unregister(agentId);
  }

  async heartbeat(heartbeat: AgentHeartbeat): Promise<void> {
    return this.store.updateHeartbeat(heartbeat);
  }

  async assignExperiment(agentId: string, experimentId: string): Promise<void> {
    await this.store.updateHeartbeat({
      agentId,
      status: 'building',
      currentExperimentId: experimentId,
    });
  }

  async logAction(
    agentId: string,
    experimentId: string,
    action: string,
    details: Record<string, unknown>,
    orgId: string,
    filesAffected?: string[],
  ): Promise<AgentAction> {
    return this.store.logAction({ agentId, experimentId, action, details, orgId, filesAffected });
  }

  async getActiveAgents(orgId: string): Promise<AgentRegistration[]> {
    const agents = await this.store.getActiveAgents(orgId);
    const now = Date.now();
    // Mark disconnected agents (no heartbeat in timeout period)
    return agents.map((agent) => {
      if (now - agent.lastHeartbeat.getTime() > this.HEARTBEAT_TIMEOUT_MS) {
        return { ...agent, status: 'disconnected' as const };
      }
      return agent;
    });
  }

  async getAgentForExperiment(experimentId: string): Promise<AgentRegistration | null> {
    return this.store.getAgentForExperiment(experimentId);
  }

  async getAuditLog(experimentId: string): Promise<AgentAction[]> {
    return this.store.getActionsForExperiment(experimentId);
  }
}
