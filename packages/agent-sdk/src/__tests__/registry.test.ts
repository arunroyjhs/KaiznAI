import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRegistry } from '../registry.js';
import type { AgentRegistryStore } from '../registry.js';
import type { AgentRegistration, AgentAction } from '@outcome-runtime/core';

function createMockStore(): AgentRegistryStore {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    updateHeartbeat: vi.fn(),
    getAgent: vi.fn(),
    getActiveAgents: vi.fn(),
    getAgentForExperiment: vi.fn(),
    logAction: vi.fn(),
    getActionsForExperiment: vi.fn(),
  };
}

function makeAgent(overrides: Partial<AgentRegistration> = {}): AgentRegistration {
  return {
    id: 'agent-1',
    runtime: 'claude-code',
    name: 'Test Agent',
    capabilities: ['code-gen'],
    connectedAt: new Date(),
    lastHeartbeat: new Date(),
    status: 'idle',
    orgId: 'org-1',
    workspaceId: 'ws-1',
    ...overrides,
  };
}

describe('AgentRegistry', () => {
  let store: AgentRegistryStore;
  let registry: AgentRegistry;

  beforeEach(() => {
    store = createMockStore();
    registry = new AgentRegistry(store);
  });

  describe('register', () => {
    it('should delegate to store with correct parameters', async () => {
      const expected = makeAgent();
      vi.mocked(store.register).mockResolvedValue(expected);

      const result = await registry.register(
        'claude-code',
        'Test Agent',
        'org-1',
        'ws-1',
        ['code-gen'],
        '1.0.0',
      );

      expect(store.register).toHaveBeenCalledWith({
        runtime: 'claude-code',
        name: 'Test Agent',
        orgId: 'org-1',
        workspaceId: 'ws-1',
        capabilities: ['code-gen'],
        version: '1.0.0',
        status: 'idle',
      });
      expect(result).toBe(expected);
    });

    it('should default capabilities to empty array when not provided', async () => {
      const expected = makeAgent({ capabilities: [] });
      vi.mocked(store.register).mockResolvedValue(expected);

      await registry.register('claude-code', 'Agent', 'org-1', 'ws-1');

      expect(store.register).toHaveBeenCalledWith(
        expect.objectContaining({ capabilities: [] }),
      );
    });

    it('should pass version as undefined when not provided', async () => {
      const expected = makeAgent();
      vi.mocked(store.register).mockResolvedValue(expected);

      await registry.register('claude-code', 'Agent', 'org-1', 'ws-1', []);

      expect(store.register).toHaveBeenCalledWith(
        expect.objectContaining({ version: undefined }),
      );
    });
  });

  describe('unregister', () => {
    it('should delegate to store', async () => {
      vi.mocked(store.unregister).mockResolvedValue(undefined);

      await registry.unregister('agent-1');

      expect(store.unregister).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('heartbeat', () => {
    it('should delegate to store updateHeartbeat', async () => {
      vi.mocked(store.updateHeartbeat).mockResolvedValue(undefined);

      const heartbeat = {
        agentId: 'agent-1',
        status: 'building' as const,
        currentExperimentId: 'exp-1',
      };

      await registry.heartbeat(heartbeat);

      expect(store.updateHeartbeat).toHaveBeenCalledWith(heartbeat);
    });
  });

  describe('assignExperiment', () => {
    it('should send heartbeat with building status and experiment id', async () => {
      vi.mocked(store.updateHeartbeat).mockResolvedValue(undefined);

      await registry.assignExperiment('agent-1', 'exp-42');

      expect(store.updateHeartbeat).toHaveBeenCalledWith({
        agentId: 'agent-1',
        status: 'building',
        currentExperimentId: 'exp-42',
      });
    });
  });

  describe('logAction', () => {
    it('should delegate to store with correct parameters', async () => {
      const expectedAction: AgentAction = {
        id: 'action-1',
        agentId: 'agent-1',
        experimentId: 'exp-1',
        action: 'file_created',
        details: { path: '/src/index.ts' },
        filesAffected: ['/src/index.ts'],
        timestamp: new Date(),
        orgId: 'org-1',
      };
      vi.mocked(store.logAction).mockResolvedValue(expectedAction);

      const result = await registry.logAction(
        'agent-1',
        'exp-1',
        'file_created',
        { path: '/src/index.ts' },
        'org-1',
        ['/src/index.ts'],
      );

      expect(store.logAction).toHaveBeenCalledWith({
        agentId: 'agent-1',
        experimentId: 'exp-1',
        action: 'file_created',
        details: { path: '/src/index.ts' },
        orgId: 'org-1',
        filesAffected: ['/src/index.ts'],
      });
      expect(result).toBe(expectedAction);
    });

    it('should pass filesAffected as undefined when not provided', async () => {
      const expectedAction: AgentAction = {
        id: 'action-2',
        agentId: 'agent-1',
        experimentId: 'exp-1',
        action: 'build_started',
        details: {},
        timestamp: new Date(),
        orgId: 'org-1',
      };
      vi.mocked(store.logAction).mockResolvedValue(expectedAction);

      await registry.logAction('agent-1', 'exp-1', 'build_started', {}, 'org-1');

      expect(store.logAction).toHaveBeenCalledWith({
        agentId: 'agent-1',
        experimentId: 'exp-1',
        action: 'build_started',
        details: {},
        orgId: 'org-1',
        filesAffected: undefined,
      });
    });
  });

  describe('getActiveAgents', () => {
    it('should mark agents as disconnected when heartbeat is older than 60 seconds', async () => {
      const oldDate = new Date(Date.now() - 120_000); // 2 minutes ago
      const staleAgent = makeAgent({
        id: 'agent-stale',
        status: 'building',
        lastHeartbeat: oldDate,
      });

      vi.mocked(store.getActiveAgents).mockResolvedValue([staleAgent]);

      const result = await registry.getActiveAgents('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('disconnected');
      expect(result[0].id).toBe('agent-stale');
    });

    it('should keep agents connected when heartbeat is recent', async () => {
      const recentDate = new Date(Date.now() - 10_000); // 10 seconds ago
      const activeAgent = makeAgent({
        id: 'agent-active',
        status: 'building',
        lastHeartbeat: recentDate,
      });

      vi.mocked(store.getActiveAgents).mockResolvedValue([activeAgent]);

      const result = await registry.getActiveAgents('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('building');
      expect(result[0].id).toBe('agent-active');
    });

    it('should handle a mix of stale and active agents', async () => {
      const staleAgent = makeAgent({
        id: 'agent-stale',
        status: 'idle',
        lastHeartbeat: new Date(Date.now() - 90_000), // 90 seconds ago
      });
      const activeAgent = makeAgent({
        id: 'agent-active',
        status: 'building',
        lastHeartbeat: new Date(Date.now() - 5_000), // 5 seconds ago
      });

      vi.mocked(store.getActiveAgents).mockResolvedValue([staleAgent, activeAgent]);

      const result = await registry.getActiveAgents('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('disconnected');
      expect(result[1].status).toBe('building');
    });

    it('should treat heartbeat within 60 seconds as connected', async () => {
      // Use 59 seconds to avoid race conditions with Date.now() advancing
      const withinBoundary = makeAgent({
        id: 'agent-boundary',
        status: 'idle',
        lastHeartbeat: new Date(Date.now() - 59_000),
      });

      vi.mocked(store.getActiveAgents).mockResolvedValue([withinBoundary]);

      const result = await registry.getActiveAgents('org-1');

      // 59000 is not > 60000, so it should remain connected
      expect(result[0].status).toBe('idle');
    });

    it('should delegate orgId to store', async () => {
      vi.mocked(store.getActiveAgents).mockResolvedValue([]);

      await registry.getActiveAgents('org-42');

      expect(store.getActiveAgents).toHaveBeenCalledWith('org-42');
    });
  });

  describe('getAgentForExperiment', () => {
    it('should delegate to store', async () => {
      const expected = makeAgent({ currentExperimentId: 'exp-1' });
      vi.mocked(store.getAgentForExperiment).mockResolvedValue(expected);

      const result = await registry.getAgentForExperiment('exp-1');

      expect(store.getAgentForExperiment).toHaveBeenCalledWith('exp-1');
      expect(result).toBe(expected);
    });

    it('should return null when no agent is assigned', async () => {
      vi.mocked(store.getAgentForExperiment).mockResolvedValue(null);

      const result = await registry.getAgentForExperiment('exp-missing');

      expect(result).toBeNull();
    });
  });

  describe('getAuditLog', () => {
    it('should delegate to store getActionsForExperiment', async () => {
      const actions: AgentAction[] = [
        {
          id: 'action-1',
          agentId: 'agent-1',
          experimentId: 'exp-1',
          action: 'file_created',
          details: {},
          timestamp: new Date(),
          orgId: 'org-1',
        },
      ];
      vi.mocked(store.getActionsForExperiment).mockResolvedValue(actions);

      const result = await registry.getAuditLog('exp-1');

      expect(store.getActionsForExperiment).toHaveBeenCalledWith('exp-1');
      expect(result).toBe(actions);
    });

    it('should return empty array when no actions exist', async () => {
      vi.mocked(store.getActionsForExperiment).mockResolvedValue([]);

      const result = await registry.getAuditLog('exp-empty');

      expect(result).toEqual([]);
    });
  });
});
